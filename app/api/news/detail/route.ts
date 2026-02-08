import { NextRequest, NextResponse } from "next/server";

import { fetchRssItems } from "@/lib/news/rss";
import { extractSymbolsHeuristic } from "@/lib/news/symbols";
import { safeSlug } from "@/lib/news/normalize";
import { dbFirst } from "@/lib/db/d1";

export const runtime = "nodejs";

const TRANSLATE_TTL_MS = 24 * 60 * 60 * 1000;
const RESPONSE_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

const g = globalThis as {
  __fx_news_translate_cache?: Map<string, { exp: number; value: { title: string; summary: string } }>;
};
if (!g.__fx_news_translate_cache) g.__fx_news_translate_cache = new Map();
const translateCache = g.__fx_news_translate_cache;

function json(payload: unknown, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": RESPONSE_CACHE,
      ...(init?.headers || {})
    }
  });
}

function hasDb() {
  return true;
}

function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function translateViaMyMemory(text: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=en|zh`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const translated = json?.responseData?.translatedText;
    if (typeof translated !== "string") return null;
    const cleaned = decodeEntities(translated).trim();
    if (!cleaned) return null;
    if (isMyMemoryWarning(cleaned)) return null;
    const input = text.trim().toLowerCase();
    const output = cleaned.toLowerCase();
    if (input && output === input) return null;
    return cleaned;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function sanitizeTranslation(text: string) {
  const stripped = (text || "").replace(/&lt;+\s*sep\s*&gt;+/gi, "");
  const decoded = decodeEntities(stripped);
  return decoded.replace(/<+\s*sep\s*>+/gi, "").replace(/[<>]+/g, "").trim();
}

const PLACEHOLDER_TRANSLATION_RE =
  /\u5916\u6587\u6807\u9898\u7ffb\u8bd1\u4e2d|\u5916\u6587\u6458\u8981\u7ffb\u8bd1\u4e2d|\u7ffb\u8bd1\u4e2d/;

function isPlaceholderTranslation(text: string) {
  return PLACEHOLDER_TRANSLATION_RE.test(text);
}

function normalizeText(value?: string | null) {
  if (!value) return "";
  const cleaned = sanitizeTranslation(String(value));
  if (!cleaned) return "";
  if (isPlaceholderTranslation(cleaned)) return "";
  return cleaned;
}

function translateCacheKey(title: string, summary: string) {
  return `${title}||${summary}`;
}

function hasSufficientCjk(text: string) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk === 0) return false;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = cjk + latin;
  if (total === 0) return false;
  return cjk / total >= 0.2;
}

function isMyMemoryWarning(text: string) {
  return /MYMEMORY WARNING/i.test(text);
}

async function translateSingleToZh(title: string, summary: string) {
  const baseTitle = normalizeText(title);
  const baseSummary = normalizeText(summary);
  if (!baseTitle && !baseSummary) return null;
  if (hasSufficientCjk(`${baseTitle} ${baseSummary}`)) return { title: baseTitle, summary: baseSummary };

  const key = translateCacheKey(baseTitle, baseSummary);
  const hit = translateCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  const translateFallback = async () => {
    const translatedTitle = await translateViaMyMemory(baseTitle);
    const translatedSummary = baseSummary ? await translateViaMyMemory(baseSummary) : null;
    const value = {
      title: sanitizeTranslation(translatedTitle || baseTitle),
      summary: sanitizeTranslation(translatedSummary || baseSummary)
    };
    translateCache.set(key, { exp: Date.now() + TRANSLATE_TTL_MS, value });
    return value;
  };

  if (!hasOpenAI()) {
    return translateFallback();
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = [
    "Translate the news title and summary into concise Chinese.",
    "Rules:",
    "- Preserve factual meaning; do not exaggerate.",
    "- Keep proper nouns, numbers, and currency codes.",
    "- Return a JSON object with keys: title, summary."
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a translation engine. Return JSON only." },
          { role: "user", content: JSON.stringify({ prompt, title, summary }) }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) return translateFallback();
    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return translateFallback();

    try {
      const parsed = JSON.parse(content);
      const value = {
        title: sanitizeTranslation(String(parsed?.title || baseTitle).trim()),
        summary: sanitizeTranslation(String(parsed?.summary || baseSummary).trim())
      };
      translateCache.set(key, { exp: Date.now() + TRANSLATE_TTL_MS, value });
      return value;
    } catch {
      return translateFallback();
    }
  } catch {
    return translateFallback();
  } finally {
    clearTimeout(timeout);
  }
}

function buildRssSlug(item: { source: string; title: string; id: string }) {
  return `${safeSlug(`${item.source}-${item.title}`)}-${item.id.slice(0, 8)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const locale = (searchParams.get("locale") === "en" ? "en" : "zh") as "zh" | "en";
  if (!slug) return json({ ok: false }, { status: 400 });

  const row = await dbFirst<any>(
    `select
      a.*,
      s.name as source_name,
      s.logo_url as source_logo_url,
      m.views as views,
      m.clicks as clicks,
      m.avg_dwell_seconds as avg_dwell_seconds
     from news_articles a
     left join news_sources s on s.id = a.source_id
     left join news_metrics m on m.article_id = a.id
     where a.slug = ?
     limit 1`,
    [slug]
  );

  if (row?.id) {
    if (row.status !== "published" || (row.scheduled_at && new Date(row.scheduled_at) > new Date())) {
      return json({ ok: false }, { status: 404 });
    }

    const titleEn = normalizeText(row.title_en || "");
    const summaryEn = normalizeText(row.summary_en || "");
    const titleZh = row.title_zh ? normalizeText(row.title_zh) : "";
    const summaryZh = row.summary_zh ? normalizeText(row.summary_zh) : "";

    const needsTitle = !titleZh || !hasSufficientCjk(titleZh);
    const needsSummary = !summaryZh || !hasSufficientCjk(summaryZh);

    let title = locale === "zh" ? (needsTitle ? titleEn : titleZh) : titleEn || titleZh;
    let summary = locale === "zh" ? (needsSummary ? summaryEn : summaryZh) : summaryEn || summaryZh;

    if (locale === "zh" && (needsTitle || needsSummary)) {
      const translated = await translateSingleToZh(titleEn, summaryEn);
      if (translated) {
        if (needsTitle) title = translated.title || title;
        if (needsSummary) summary = translated.summary || summary;
      }
    }

    const titleAlt = locale === "zh" ? titleEn || titleZh : titleZh || titleEn;
    const keyPoints = locale === "zh" ? parseJsonArray(row.key_points_zh_json) : parseJsonArray(row.key_points_en_json);
    const lens = locale === "zh" ? String(row.fxlocus_lens_zh || "") : String(row.fxlocus_lens_en || "");
    const symbols = parseJsonArray(row.symbols_json);
    let content =
      locale === "zh"
        ? normalizeText(row.content_zh || "") || normalizeText(row.content_en || "")
        : normalizeText(row.content_en || "") || normalizeText(row.content_zh || "");
    if (!content) content = summary || "";

    return json(
      {
        ok: true,
        article: {
          id: row.id,
          slug: row.slug,
          url: row.url,
          source: row.source_name,
          logo: row.source_logo_url,
          author: row.author,
          publishedAt: row.published_at,
          category: row.category,
          importance: row.importance,
          sentiment: row.sentiment,
          symbols,
          title,
          titleAlt,
          summary,
          coverImage: row.cover_image_url,
          keyPoints,
          lens,
          content,
          views: Number(row.views || 0),
          clicks: Number(row.clicks || 0)
        }
      },
      { status: 200 }
    );
  }

  const rssItems = await fetchRssItems({ limit: 200 });
  const match = rssItems.find((item) => buildRssSlug(item) === slug);
  if (!match) return json({ ok: false }, { status: 404 });

  let title = normalizeText(match.title);
  let summary = normalizeText(match.summary || "");

  if (locale === "zh") {
    const translated = await translateSingleToZh(title, summary);
    if (translated) {
      title = translated.title || title;
      summary = translated.summary || summary;
    }
  }

  return json(
    {
      ok: true,
      article: {
        id: match.id,
        slug,
        url: match.link,
        source: match.source,
        logo: "",
        author: "",
        publishedAt: match.publishedAt,
        category: match.category,
        importance: "medium",
        sentiment: "neutral",
        symbols: extractSymbolsHeuristic(`${title} ${summary}`),
        title,
        titleAlt: locale === "zh" ? normalizeText(match.title) : title,
        summary,
        coverImage: null,
        keyPoints: [],
        lens: "RSS-sourced summary for training use only, not investment advice.",
        content: summary,
        views: 0,
        clicks: 0
      }
    },
    { status: 200 }
  );
}

function parseJsonArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}



