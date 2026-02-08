import { createHash } from "crypto";
import Parser from "rss-parser";

export type FeedItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  category: string;
  summary?: string;
  contentHtml?: string;
};

type Source = {
  source: string;
  url: string;
  category: string;
};

const sources: Source[] = [
  {
    source: "FXStreet",
    url: "https://www.fxstreet.com/rss/news",
    category: "fx"
  },
  {
    source: "DailyFX",
    url: "https://www.dailyfx.com/feeds/market-news",
    category: "fx"
  },
  {
    source: "Nasdaq",
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Stock-Market-News",
    category: "stocks"
  },
  {
    source: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
    category: "crypto"
  },
  {
    source: "EIA",
    url: "https://www.eia.gov/rss/overview.xml",
    category: "commodities"
  },
  {
    source: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    category: "macro"
  },
  {
    source: "Google News Markets",
    url: "https://news.google.com/rss/search?q=market+news&hl=en-US&gl=US&ceid=US:en",
    category: "macro"
  }
];

const parser = new Parser({
  timeout: 7000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
  }
});

const RSS_CACHE_TTL_MS = 10 * 60 * 1000;
const rssCache = new Map<string, { exp: number; items: FeedItem[] }>();

function buildId(input: string) {
  return createHash("sha1").update(input).digest("hex");
}

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type FetchOptions = {
  category?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  fast?: boolean;
};

const FAST_SOURCE_NAMES = new Set([
  "FXStreet",
  "DailyFX",
  "Nasdaq",
  "CoinDesk",
  "Google News Markets"
]);

export async function fetchRssItems({ category, from, to, limit, fast }: FetchOptions) {
  const fromDate = parseDate(from ?? undefined);
  const toDate = parseDate(to ?? undefined);
  const cacheKey = [category ?? "all", from ?? "", to ?? "", fast ? "fast" : "full"].join("|");
  const cached = rssCache.get(cacheKey);
  if (cached && cached.exp > Date.now() && cached.items.length) {
    const cachedItems = cached.items;
    if (typeof limit === "number" && limit > 0) {
      return cachedItems.slice(0, limit);
    }
    return cachedItems;
  }

  const activeSources = category
    ? sources.filter((source) => source.category === category)
    : sources;
  const fastSources = activeSources.filter((source) => FAST_SOURCE_NAMES.has(source.source));
  const selectedSources = fast && fastSources.length ? fastSources : activeSources;

  const results = await Promise.allSettled(
    selectedSources.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      return { source, items: feed.items ?? [] };
    })
  );

  const seen = new Set<string>();
  const items: FeedItem[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { source, items: feedItems } = result.value;

    for (const item of feedItems) {
      const title = item.title?.trim() ?? "";
      const link = item.link?.trim() ?? "";
      const publishedAt =
        (item.isoDate || item.pubDate || item.published || item.updated) ?? "";
      const contentHtml =
        (item as any)["content:encoded"] ||
        (item as any).content ||
        (item as any).summary ||
        "";

      if (!title || !link) continue;

      const publishedDate = parseDate(publishedAt);
      if (fromDate && publishedDate && publishedDate < fromDate) continue;
      if (toDate && publishedDate && publishedDate > toDate) continue;

      const id = buildId(`${source.source}|${link}|${publishedAt}`);
      if (seen.has(id)) continue;
      seen.add(id);

      items.push({
        id,
        title,
        link,
        source: source.source,
        publishedAt: publishedDate ? publishedDate.toISOString() : publishedAt,
        category: source.category,
        summary: item.contentSnippet?.trim() || item.summary?.trim() || undefined,
        contentHtml: typeof contentHtml === "string" ? contentHtml : undefined
      });
    }
  }

  items.sort((a, b) => {
    const aTime = Date.parse(a.publishedAt || "");
    const bTime = Date.parse(b.publishedAt || "");
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  if (items.length) {
    rssCache.set(cacheKey, { exp: Date.now() + RSS_CACHE_TTL_MS, items });
  } else {
    const cached = rssCache.get(cacheKey);
    if (cached?.items?.length) {
      const cachedItems = cached.items;
      if (typeof limit === "number" && limit > 0) {
        return cachedItems.slice(0, limit);
      }
      return cachedItems;
    }
  }

  if (typeof limit === "number" && limit > 0) {
    return items.slice(0, limit);
  }

  return items;
}
