import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

export const runtime = "nodejs";

type Item = {
  id: string;
  title: string;
  titleLocalized?: string;
  link: string;
  source: string;
  publishedAt?: string;
};

const parser = new Parser({ timeout: 12_000 });

const g = globalThis as any;
if (!g.__fx_news_cache) g.__fx_news_cache = new Map<string, { exp: number; items: Item[] }>();
const cache: Map<string, { exp: number; items: Item[] }> = g.__fx_news_cache;

if (!g.__fx_news_translate_cache)
  g.__fx_news_translate_cache = new Map<string, { exp: number; zh: string }>();
const tcache: Map<string, { exp: number; zh: string }> = g.__fx_news_translate_cache;

const FEEDS = ["https://www.fxstreet.com/rss/news", "https://www.fxstreet.com/rss/analysis"];

async function translateBatchToZh(titles: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = [
    "Translate each English news headline into concise, accurate Chinese.",
    "Rules:",
    "- Preserve factual meaning; do not exaggerate.",
    "- Keep proper nouns, numbers, and currency codes.",
    "- Return JSON with shape: {\"items\":[\"...\"]}",
    "- The items array must match the input order and length."
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a translation engine. Return JSON only." },
          { role: "user", content: JSON.stringify({ prompt, titles }) }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(arr)) return null;
      return arr.map((item: any) => String(item || "").trim());
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim();
  const locale = (searchParams.get("locale") === "en" ? "en" : "zh") as "zh" | "en";

  const cacheKey = `${symbol}|${locale}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.exp) return NextResponse.json({ items: hit.items }, { status: 200 });

  const all: Item[] = [];

  await Promise.all(
    FEEDS.map(async (url) => {
      try {
        const feed = await parser.parseURL(url);
        const source = feed.title || new URL(url).hostname;
        for (const item of (feed.items || []).slice(0, 20)) {
          const title = String(item.title || "").trim();
          const link = String(item.link || "").trim();
          if (!title || !link) continue;
          const publishedAt = (item as any).isoDate
            ? new Date((item as any).isoDate).toISOString()
            : undefined;

          all.push({
            id: `${source}:${link}`,
            title,
            link,
            source,
            publishedAt
          });
        }
      } catch {
        // ignore
      }
    })
  );

  let items = all;
  if (symbol) {
    const ks = symbol
      .replace("-", "/")
      .split("/")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const filtered = all.filter((item) =>
      ks.some((k) => item.title.toUpperCase().includes(k))
    );
    if (filtered.length >= 5) items = filtered;
  }

  items.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  items = items.slice(0, 12);

  if (locale === "zh") {
    const needTranslate: { idx: number; title: string }[] = [];
    const now = Date.now();

    for (let i = 0; i < items.length; i += 1) {
      const title = items[i].title;
      const key = `zh:${title}`;
      const thit = tcache.get(key);
      if (thit && now < thit.exp) {
        items[i].titleLocalized = thit.zh;
      } else {
        needTranslate.push({ idx: i, title });
      }
    }

    if (needTranslate.length) {
      const translated = await translateBatchToZh(needTranslate.map((item) => item.title));
      if (translated && translated.length === needTranslate.length) {
        for (let j = 0; j < needTranslate.length; j += 1) {
          const idx = needTranslate[j].idx;
          const zh = translated[j] || items[idx].title;
          items[idx].titleLocalized = zh;
          tcache.set(`zh:${items[idx].title}`, { exp: Date.now() + 24 * 3600_000, zh });
        }
      }
    }
  }

  cache.set(cacheKey, { exp: Date.now() + 120_000, items });
  return NextResponse.json({ items }, { status: 200 });
}
