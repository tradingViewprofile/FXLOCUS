import { NextRequest, NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";

import { dbAll, dbFirst } from "@/lib/db/d1";
import { fetchRssItems } from "@/lib/news/rss";
import { extractSymbolsHeuristic } from "@/lib/news/symbols";
import { safeSlug } from "@/lib/news/normalize";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30_000;
const TRANSLATE_TTL_MS = 24 * 60 * 60 * 1000;
const GOOGLE_BLOCK_TTL_MS = 30 * 60 * 1000;
const RESPONSE_CACHE = "public, s-maxage=30, stale-while-revalidate=120";

const g = globalThis as {
  __fx_news_list_cache?: Map<string, { exp: number; payload: unknown }>;
  __fx_news_translate_cache?: Map<string, { exp: number; value: { title: string; summary: string } }>;
  __fx_google_translate_blocked_until?: number;
};
if (!g.__fx_news_list_cache) g.__fx_news_list_cache = new Map();
const cache = g.__fx_news_list_cache;
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

function cacheGet(key: string) {
  const hit = cache?.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    cache?.delete(key);
    return null;
  }
  return hit.payload;
}

function cacheSet(key: string, payload: unknown) {
  cache?.set(key, { exp: Date.now() + CACHE_TTL_MS, payload });
}

function hasDb() {
  return true;
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

function hasAnyCjk(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

function isMyMemoryWarning(text: string) {
  return /MYMEMORY WARNING/i.test(text);
}

function isGoogleBlocked() {
  const until = g.__fx_google_translate_blocked_until;
  return typeof until === "number" && until > Date.now();
}

function blockGoogleTranslate() {
  g.__fx_google_translate_blocked_until = Date.now() + GOOGLE_BLOCK_TTL_MS;
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

async function translateViaGoogle(text: string) {
  if (isGoogleBlocked()) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      blockGoogleTranslate();
      return null;
    }
    const json = await res.json().catch(() => null);
    const parts = Array.isArray(json) ? json[0] : null;
    if (!Array.isArray(parts)) return null;
    const translated = parts.map((part: any) => String(part?.[0] || "")).join("");
    if (!translated) return null;
    return decodeEntities(translated);
  } catch {
    blockGoogleTranslate();
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

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  runner: (item: T, idx: number) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await runner(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function sanitizeHtmlContent(html?: string | null) {
  if (!html) return "";
  return sanitizeHtml(String(html), {
    allowedTags: [
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "a",
      "span",
      "div"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "srcset"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"]
    },
    allowedSchemes: ["http", "https", "data"],
    allowProtocolRelative: true,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || "";
        const safeHref = href.startsWith("javascript:") ? "" : href;
        return {
          tagName,
          attribs: {
            ...attribs,
            href: safeHref,
            target: "_blank",
            rel: "noreferrer"
          }
        };
      }
    }
  }).trim();
}

async function translateViaMyMemoryBatch(items: Array<{ title: string; summary: string }>) {
  const results = await mapWithConcurrency(items, 4, async (item) => {
    const googleTitle = await translateViaGoogle(item.title);
    const googleSummary = item.summary ? await translateViaGoogle(item.summary) : null;
    const memoryTitle = await translateViaMyMemory(item.title);
    const memorySummary = item.summary ? await translateViaMyMemory(item.summary) : null;
    const titleRaw = (hasAnyCjk(googleTitle || "") ? googleTitle : null)
      || (hasAnyCjk(memoryTitle || "") ? memoryTitle : null)
      || item.title;
    const summaryRaw = item.summary
      ? (hasAnyCjk(googleSummary || "") ? googleSummary : null)
        || (hasAnyCjk(memorySummary || "") ? memorySummary : null)
        || item.summary
      : item.summary;
    const title = normalizeText(titleRaw) || item.title;
    const summary = item.summary ? normalizeText(summaryRaw) || item.summary : item.summary;
    return { title, summary };
  });
  return results;
}

async function translateBatchToZh(
  items: Array<{ title: string; summary: string }>,
  preferFree = false
) {
  if (preferFree) {
    return translateViaMyMemoryBatch(items);
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return translateViaMyMemoryBatch(items);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = [
    "Translate each news title and summary into concise Chinese.",
    "Rules:",
    "- Preserve factual meaning; do not exaggerate.",
    "- Keep proper nouns, numbers, and currency codes.",
    "- Return JSON with shape: {\"items\":[{\"title\":\"...\",\"summary\":\"...\"}]}",
    "- The items array must match the input order and length."
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
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
          { role: "user", content: JSON.stringify({ prompt, items }) }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) return translateViaMyMemoryBatch(items);
    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return translateViaMyMemoryBatch(items);

    try {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(arr) || arr.length !== items.length) {
        return translateViaMyMemoryBatch(items);
      }
      const normalized = arr.map((item: any, idx: number) => {
        const title = normalizeText(String(item?.title || "").trim());
        const summary = normalizeText(String(item?.summary || "").trim());
        return {
          title,
          summary: items[idx].summary ? summary : ""
        };
      });
      const needsFallback = normalized.some((item, idx) => {
        const titleOk = hasAnyCjk(item.title || "");
        if (!items[idx].summary) return !titleOk;
        const summaryOk = hasAnyCjk(item.summary || "");
        return !titleOk || !summaryOk;
      });
      if (!needsFallback) return normalized;
      const fallback = await translateViaMyMemoryBatch(items);
      return normalized.map((item, idx) => ({
        title: hasAnyCjk(item.title || "") ? item.title : fallback[idx]?.title || item.title,
        summary: items[idx].summary
          ? hasAnyCjk(item.summary || "")
            ? item.summary
            : fallback[idx]?.summary || item.summary
          : ""
      }));
    } catch {
      return translateViaMyMemoryBatch(items);
    }
  } catch {
    return translateViaMyMemoryBatch(items);
  } finally {
    clearTimeout(timeout);
  }
}

async function applyZhTranslation<
  T extends {
    titleEn: string;
    summaryEn: string;
    titleZh?: string | null;
    summaryZh?: string | null;
  }
>(items: T[], preferFree = false) {

  const now = Date.now();
  const pending: Array<{
    idx: number;
    title: string;
    summary: string;
    needsTitle: boolean;
    needsSummary: boolean;
  }> = [];
  const cached = new Map<number, { title?: string; summary?: string }>();
  const needsMap = new Map<number, { title: boolean; summary: boolean }>();

  items.forEach((item, idx) => {
    const titleZh = normalizeText(item.titleZh);
    const summaryZh = normalizeText(item.summaryZh);
    const needsTitle = !titleZh || !hasSufficientCjk(titleZh);
    const needsSummary = !summaryZh || !hasSufficientCjk(summaryZh);
    const hasZh = !needsTitle && !needsSummary;
    const sourceTitle = item.titleEn || "";
    const sourceSummary = item.summaryEn || "";
    needsMap.set(idx, { title: needsTitle, summary: needsSummary });
    if (hasZh) return;
    if (!sourceTitle && !sourceSummary) return;
    if (hasSufficientCjk(`${sourceTitle} ${sourceSummary}`)) return;
    const key = translateCacheKey(sourceTitle, sourceSummary || "");
    const hit = translateCache.get(key);
    if (hit && hit.exp > now) {
      const cachedTitle = sanitizeTranslation(hit.value.title || "");
      const cachedSummary = sanitizeTranslation(hit.value.summary || "");
      const cachedValue: { title?: string; summary?: string } = {};
      if (hasAnyCjk(cachedTitle)) cachedValue.title = cachedTitle;
      if (hasAnyCjk(cachedSummary)) cachedValue.summary = cachedSummary;
      if (cachedValue.title || cachedValue.summary) cached.set(idx, cachedValue);

      const titleOk = !needsTitle || Boolean(cachedValue.title);
      const summaryOk = !needsSummary || Boolean(cachedValue.summary);
      if (titleOk && summaryOk) return;
    }

    pending.push({
      idx,
      title: sourceTitle,
      summary: sourceSummary || "",
      needsTitle,
      needsSummary
    });
  });

  const translated = new Map<number, { title?: string; summary?: string }>();
  cached.forEach((value, idx) => translated.set(idx, value));

  const batchSize = 8;
  const batches: Array<Array<typeof pending[number]>> = [];
  for (let i = 0; i < pending.length; i += batchSize) {
    batches.push(pending.slice(i, i + batchSize));
  }

  const results = await mapWithConcurrency(batches, 2, async (slice) => {
    const resp = await translateBatchToZh(
      slice.map((item) => ({ title: item.title, summary: item.summary })),
      preferFree
    );
    return { slice, resp };
  });

  for (const { slice, resp } of results) {
    if (!resp || resp.length !== slice.length) continue;
    for (let j = 0; j < slice.length; j += 1) {
      const translatedItem = resp[j];
      if (!translatedItem?.title && !translatedItem?.summary) continue;
      const { idx } = slice[j];
      const titleCandidate = sanitizeTranslation(translatedItem.title || slice[j].title);
      const summaryCandidate = sanitizeTranslation(translatedItem.summary || slice[j].summary);
      const title = hasAnyCjk(titleCandidate) ? titleCandidate : "";
      const summary = hasAnyCjk(summaryCandidate) ? summaryCandidate : "";
      if (!title && !summary) continue;
      const existing = translated.get(idx) || {};
      translated.set(idx, {
        title: title || existing.title,
        summary: summary || existing.summary
      });
      const key = translateCacheKey(slice[j].title, slice[j].summary);
      translateCache.set(key, {
        exp: Date.now() + TRANSLATE_TTL_MS,
        value: { title: title || "", summary: summary || "" }
      });
    }
  }

  return items.map((item, idx) => {
    const needs = needsMap.get(idx);
    const t = translated.get(idx);
    if (!t && !needs) return item;
    const titleZh = normalizeText(item.titleZh);
    const summaryZh = normalizeText(item.summaryZh);
    return {
      ...item,
      titleZh: needs?.title
        ? t?.title || titleZh || item.titleEn
        : titleZh || item.titleEn,
      summaryZh: needs?.summary
        ? t?.summary || summaryZh || item.summaryEn
        : summaryZh || item.summaryEn
    };
  });
}

async function rssFallback({
  locale,
  category,
  importance,
  range,
  symbol,
  q,
  page,
  pageSize,
  fast,
  preferFree
}: {
  locale: "zh" | "en";
  category: string;
  importance: string;
  range: string;
  symbol: string;
  q: string;
  page: number;
  pageSize: number;
  fast?: boolean;
  preferFree?: boolean;
}) {
  const now = new Date();
  const start = new Date(now);
  let end: Date | null = null;
  if (range === "today") start.setDate(now.getDate() - 1);
  if (range === "yesterday") {
    start.setDate(now.getDate() - 2);
    end = new Date(now);
    end.setDate(now.getDate() - 1);
  }
  if (range === "week") start.setDate(now.getDate() - 7);
  if (range === "month") start.setMonth(now.getMonth() - 1);
  const rangeEnd = end ?? now;

  if (importance !== "all" && importance !== "medium") {
    return { ok: true, items: [], total: 0, fallback: "rss" };
  }

  const items = await fetchRssItems({
    category: category === "all" ? null : category,
    limit: 200,
    fast
  });

  const upperSymbol = symbol.trim().toUpperCase();
  const keyword = q.trim().toLowerCase();

  const filteredByRange = items.filter((item) => {
    const publishedDate = item.publishedAt ? new Date(item.publishedAt) : null;
    if (publishedDate && publishedDate < start) return false;
    if (publishedDate && publishedDate > rangeEnd) return false;
    return true;
  });

  let filtered = filteredByRange.filter((item) => {
    const title = item.title || "";
    const summary = item.summary || "";
    const text = `${title} ${summary}`.toLowerCase();
    if (keyword && !text.includes(keyword)) return false;
    if (upperSymbol) {
      const hintSymbols = extractSymbolsHeuristic(`${title} ${summary}`).map((s) =>
        s.toUpperCase()
      );
      if (
        !title.toUpperCase().includes(upperSymbol) &&
        !summary.toUpperCase().includes(upperSymbol) &&
        !hintSymbols.includes(upperSymbol)
      ) {
        return false;
      }
    }
    return true;
  });

  if (!filtered.length && !upperSymbol && !keyword) {
    filtered = items;
  }

  const total = filtered.length;
  const startIdx = (page - 1) * pageSize;
  let pageItems = filtered.slice(startIdx, startIdx + pageSize).map((item) => {
    const title = normalizeText(item.title);
    const summary = normalizeText(item.summary || "");
    const symbols = extractSymbolsHeuristic(`${title} ${summary}`);
    const contentHtml = sanitizeHtmlContent(item.contentHtml || "");
    return {
      id: item.id,
      slug: `${safeSlug(`${item.source}-${item.title}`)}-${item.id.slice(0, 8)}`,
      url: item.link,
      source: item.source,
      logo: "",
      titleEn: title,
      summaryEn: summary,
      contentHtml,
      titleZh: null,
      summaryZh: null,
      author: "",
      publishedAt: item.publishedAt,
      category: item.category,
      importance: "medium",
      sentiment: "neutral",
      symbols,
      views: 0,
      clicks: 0
    };
  });

  if (locale === "zh" && !fast) {
    pageItems = await applyZhTranslation(pageItems, preferFree);
  }

  return {
    ok: true,
    items: pageItems.map((item) => ({
      id: item.id,
      slug: item.slug,
      url: item.url,
      source: item.source,
      logo: item.logo,
      title: item.titleZh || item.titleEn,
      summary: item.summaryZh || item.summaryEn,
      content: item.summaryZh || item.summaryEn,
      contentHtml: item.contentHtml || "",
      langTag: item.titleZh ? "ZH" : "EN",
      author: item.author,
      publishedAt: item.publishedAt,
      category: item.category,
      importance: item.importance,
      sentiment: item.sentiment,
      symbols: item.symbols,
      views: item.views,
      clicks: item.clicks
    })),
    total,
    fallback: "rss"
  };
}

async function safeFallback(args: Parameters<typeof rssFallback>[0]) {
  try {
    return await rssFallback(args);
  } catch {
    return { ok: true, items: [], total: 0, fallback: "rss" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let locale: "zh" | "en" = "zh";
  let category = "all";
  let importance = "all";
  let range = "today";
  let symbol = "";
  let q = "";
  let page = 1;
  let pageSize = 20;
  let fast = false;
  const preferFree = (searchParams.get("translate") || "").toLowerCase() === "free";

  try {
    locale = (searchParams.get("locale") === "en" ? "en" : "zh") as "zh" | "en";
    category = searchParams.get("category") || "all";
    importance = searchParams.get("importance") || "all";
    range = searchParams.get("range") || "today";
    symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
    q = (searchParams.get("q") || "").trim();
    page = Math.max(1, Number(searchParams.get("page") || 1));
    pageSize = Math.min(60, Math.max(10, Number(searchParams.get("pageSize") || 20)));
    fast = ["1", "true", "yes"].includes((searchParams.get("fast") || "").toLowerCase());
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const cacheKey = [
      "news:list",
      locale,
      category,
      importance,
      range,
      fast ? "fast" : "full",
      symbol,
      q,
      page,
      pageSize
    ].join("|");

    const cached = cacheGet(cacheKey);
    if (cached) return json(cached, { status: 200 });

    if (!hasDb()) {
      const payload = await safeFallback({
        locale,
        category,
        importance,
        range,
        symbol,
        q,
        page,
        pageSize,
        fast,
        preferFree
      });
      cacheSet(cacheKey, payload);
      return json(payload, { status: 200 });
    }

    // Prefer DB-backed content; fallback to RSS if needed.

    const now = new Date();
    const start = new Date(now);
    let end: Date | null = null;
    if (range === "today") start.setDate(now.getDate() - 1);
    if (range === "yesterday") {
      start.setDate(now.getDate() - 2);
      end = new Date(now);
      end.setDate(now.getDate() - 1);
    }
    if (range === "week") start.setDate(now.getDate() - 7);
    if (range === "month") start.setMonth(now.getMonth() - 1);

    const whereParts: string[] = ["a.status = ?", "a.published_at >= ?"];
    const bind: any[] = ["published", start.toISOString()];
    if (end) {
      whereParts.push("a.published_at < ?");
      bind.push(end.toISOString());
    }
    if (category !== "all") {
      whereParts.push("a.category = ?");
      bind.push(category);
    }
    if (importance !== "all") {
      whereParts.push("a.importance = ?");
      bind.push(importance);
    }
    if (symbol.length >= 3) {
      whereParts.push("a.symbols_json like ?");
      bind.push(`%\"${symbol.replace(/\"/g, "")}\"%`);
    }
    if (q.length >= 2) {
      whereParts.push(
        "(lower(a.title_en) like lower(?) or lower(a.title_zh) like lower(?) or lower(a.summary_en) like lower(?) or lower(a.summary_zh) like lower(?))"
      );
      const pat = `%${q}%`;
      bind.push(pat, pat, pat, pat);
    }

    const whereSql = whereParts.length ? `where ${whereParts.join(" and ")}` : "";

    const countRow = await dbFirst<{ c: number }>(
      `select count(*) as c from news_articles a ${whereSql}`.trim(),
      bind
    );
    const totalCount = Number(countRow?.c || 0);

    const data = await dbAll<any>(
      `select
         a.id,
         a.slug,
         a.url,
         a.source_id,
         a.title_en,
         a.title_zh,
         a.summary_en,
         a.summary_zh,
         a.content_en,
         a.content_zh,
         a.cover_image_url,
         a.author,
         a.published_at,
         a.category,
         a.importance,
         a.sentiment,
         a.symbols_json,
         a.status,
         s.name as source_name,
         s.logo_url as source_logo_url,
         m.views as views,
         m.clicks as clicks
       from news_articles a
       left join news_sources s on s.id = a.source_id
       left join news_metrics m on m.article_id = a.id
       ${whereSql}
       order by a.published_at desc
       limit ? offset ?`.trim(),
      [...bind, pageSize, from]
    );

    if (!Array.isArray(data)) {
      const payload = await safeFallback({
        locale,
        category,
        importance,
        range,
        symbol,
        q,
        page,
        pageSize,
        fast,
        preferFree
      });
      cacheSet(cacheKey, payload);
      return json(payload, { status: 200 });
    }

    let items = (data || []).map((item: any) => {
      return {
        id: item.id,
        slug: item.slug,
        url: item.url,
        source: item.source_name || "",
        logo: item.source_logo_url || "",
        titleEn: normalizeText(item.title_en || ""),
        summaryEn: normalizeText(item.summary_en || ""),
        contentEn: normalizeText(item.content_en || ""),
        titleZh: item.title_zh ? normalizeText(item.title_zh) : null,
        summaryZh: item.summary_zh ? normalizeText(item.summary_zh) : null,
        contentZh: item.content_zh ? normalizeText(item.content_zh) : null,
        coverImage: item.cover_image_url || "",
        author: item.author,
        publishedAt: item.published_at,
        category: item.category,
        importance: item.importance,
        sentiment: item.sentiment,
        symbols: parseJsonArray(item.symbols_json),
        views: Number(item.views || 0),
        clicks: Number(item.clicks || 0)
      };
    });

    const rawHtmlMap = new Map<string, string>();
    const urls = items.map((item) => item.url).filter(Boolean);
    if (urls.length) {
      const rawRows = await dbAll<any>(
        `select url, raw_html from news_raw where url in (${urls.map(() => "?").join(",")})`,
        urls
      );
      (rawRows || []).forEach((row: any) => {
        if (row?.url && row?.raw_html) {
          rawHtmlMap.set(row.url, sanitizeHtmlContent(row.raw_html));
        }
      });
    }

    if (!items.length && page === 1 && !symbol && !q) {
      const payload = await safeFallback({
        locale,
        category,
        importance,
        range,
        symbol,
        q,
        page,
        pageSize,
        fast,
        preferFree
      });
      cacheSet(cacheKey, payload);
      return json(payload, { status: 200 });
    }

    if (locale === "zh" && !fast) {
      items = await applyZhTranslation(items, preferFree);
    }

    const payload = {
      ok: true,
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        url: item.url,
        source: item.source,
        logo: item.logo,
        title: locale === "zh" ? item.titleZh || item.titleEn : item.titleEn || item.titleZh,
        summary: locale === "zh" ? item.summaryZh || item.summaryEn : item.summaryEn || item.summaryZh,
        content:
          locale === "zh"
            ? item.contentZh || item.summaryZh || item.summaryEn || item.contentEn
            : item.contentEn || item.summaryEn || item.summaryZh || item.contentZh,
        contentHtml:
          rawHtmlMap.get(item.url) ||
          (item.contentEn && /<[^>]+>/.test(item.contentEn)
            ? sanitizeHtmlContent(item.contentEn)
            : ""),
        coverImage: item.coverImage,
        langTag:
          locale === "zh"
            ? item.titleZh
              ? "ZH"
              : "EN"
            : item.titleEn
              ? "EN"
              : "ZH",
        author: item.author,
        publishedAt: item.publishedAt,
        category: item.category,
        importance: item.importance,
        sentiment: item.sentiment,
        symbols: item.symbols,
        views: item.views,
        clicks: item.clicks
      })),
      total: totalCount
    };
    cacheSet(cacheKey, payload);
    return json(payload, { status: 200 });
  } catch (error: any) {
    const payload = await safeFallback({
      locale,
      category,
      importance,
      range,
      symbol,
      q,
      page,
      pageSize,
      fast,
      preferFree
    });
    cacheSet("news:list:fallback", payload);
    return json(payload, { status: 200 });
  }
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



