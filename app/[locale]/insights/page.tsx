import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/marketing/PageHero";
import { InsightsExplorer } from "@/components/insights/InsightsExplorer";
import type { Locale } from "@/i18n/routing";
import type { Pillar } from "@/lib/domain/types";

type Props = {
  params: { locale: Locale };
};

export const revalidate = 120;

const FETCH_TIMEOUT_MS = 1800;

const PRICE_ACTION_CATEGORIES = new Set([
  "fx",
  "forex",
  "currencies",
  "currency",
  "commodities",
  "metals",
  "energy",
  "oil",
  "gold",
  "silver",
  "futures",
  "technical",
  "technical-analysis"
]);

const MARKET_CATEGORIES = new Set([
  "macro",
  "stocks",
  "equities",
  "stock",
  "crypto",
  "economy",
  "rates",
  "bonds",
  "policy",
  "indices",
  "markets"
]);

const MIND_CATEGORIES = new Set(["sentiment", "psychology", "opinion", "commentary"]);

const MIND_KEYWORDS = [
  "sentiment",
  "psychology",
  "emotion",
  "discipline",
  "behavior",
  "behaviour",
  "fear",
  "greed",
  "confidence",
  "optimism",
  "pessimism",
  "risk appetite",
  "risk-on",
  "risk-off",
  "uncertainty",
  "panic",
  "euphoria",
  "positioning",
  "volatility"
];

const MARKET_KEYWORDS = [
  "inflation",
  "gdp",
  "macro",
  "central bank",
  "interest rate",
  "rates",
  "policy",
  "employment",
  "jobs",
  "recession",
  "growth",
  "cpi",
  "ppi",
  "yield",
  "treasury",
  "bond",
  "tariff",
  "geopolit",
  "earnings"
];

const PRICE_ACTION_KEYWORDS = [
  "price",
  "prices",
  "chart",
  "technical",
  "support",
  "resistance",
  "breakout",
  "trend",
  "pattern",
  "candlestick",
  "rally",
  "pullback",
  "levels",
  "futures"
];

function resolveBaseUrl() {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    const trimmed = configured.replace(/\/$/, "");
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const isLocal = /localhost|127\.0\.0\.1/.test(trimmed);
    return `${isLocal ? "http" : "https"}://${trimmed}`;
  }
  return "http://localhost:3000";
}

async function fetchJsonWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getTime();
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function pillarFromItem({
  category,
  title,
  summary,
  slug,
  sentiment
}: {
  category?: string | null;
  title?: string | null;
  summary?: string | null;
  slug?: string | null;
  sentiment?: string | null;
}): Pillar {
  const cat = normalizeValue(category);
  const text = normalizeValue([title, summary, slug].filter(Boolean).join(" "));

  if (MIND_CATEGORIES.has(cat) || (text && hasAny(text, MIND_KEYWORDS))) return "mind";
  if (PRICE_ACTION_CATEGORIES.has(cat) || (text && hasAny(text, PRICE_ACTION_KEYWORDS))) {
    return "price_action";
  }
  if (MARKET_CATEGORIES.has(cat) || (text && hasAny(text, MARKET_KEYWORDS))) return "market";
  if (sentiment && normalizeValue(sentiment) !== "neutral") return "mind";
  return "market";
}

function importanceScore(value?: string | null) {
  const normalized = normalizeValue(value);
  if (normalized === "high") return 200;
  if (normalized === "medium") return 120;
  if (normalized === "low") return 60;
  return 0;
}

function ensurePillarCoverage(
  items: Array<{ pillar: Pillar; popularity: number; publishedAtTs: number }>
) {
  if (!items.length) return;
  const counts = { mind: 0, market: 0, price_action: 0 };
  items.forEach((item) => {
    counts[item.pillar] += 1;
  });

  const desired = Math.min(4, Math.max(3, Math.floor(items.length * 0.12)));
  const locked = new Set<number>();

  const reassign = (pillar: Pillar) => {
    if (counts[pillar] > 0) return;
    const candidates = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item, idx }) => item.pillar !== pillar && !locked.has(idx))
      .sort((a, b) => {
        const byPopularity = b.item.popularity - a.item.popularity;
        if (byPopularity !== 0) return byPopularity;
        return b.item.publishedAtTs - a.item.publishedAtTs;
      });

    for (let i = 0; i < Math.min(desired, candidates.length); i += 1) {
      const { item, idx } = candidates[i];
      counts[item.pillar] -= 1;
      item.pillar = pillar;
      counts[pillar] += 1;
      locked.add(idx);
    }
  };

  reassign("mind");
  reassign("price_action");
  reassign("market");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("insightsTitle"),
    description: t("insightsDesc")
  };
}

export default async function InsightsPage({ params }: Props) {
  const locale = params.locale === "en" ? "en" : "zh";
  const t = await getTranslations({ locale, namespace: "insights" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const highlights = t.raw("hero.highlights") as string[];

  const baseUrl = resolveBaseUrl();
  const query = new URLSearchParams({
    locale,
    range: "week",
    page: "1",
    pageSize: "30",
    category: "all",
    importance: "all"
  });
  if (locale === "en") query.set("fast", "1");

  let previews: Array<{
    slug: string;
    pillar: Pillar;
    title: string;
    excerpt: string;
    readingTime: number;
    popularity: number;
    publishedAt: string;
    publishedAtTs: number;
    tags: string[];
    url?: string;
  }> = [];

  try {
    const json = await fetchJsonWithTimeout(
      `${baseUrl}/api/news/list?${query.toString()}`,
      { next: { revalidate: 120 } },
      FETCH_TIMEOUT_MS
    );
    if (json?.ok && Array.isArray(json.items)) {
      previews = json.items.map((item: any) => {
        const title = String(item.title || "").trim();
        const excerpt = String(item.summary || item.content || "").trim();
        const tags = Array.isArray(item.symbols) ? item.symbols.map(String) : [];
        const text = `${title} ${excerpt}`.trim();
        const readingTime = Math.max(2, Math.ceil(text.length / 220));
        const views = Number(item.views || 0);
        const clicks = Number(item.clicks || 0);
        const popularity = views * 3 + clicks * 6 + importanceScore(item.importance) + readingTime;
        const publishedAtTs = toTimestamp(item.publishedAt);
        const slug = String(item.slug || item.id);
        return {
          slug,
          url: typeof item.url === "string" ? item.url : undefined,
          pillar: pillarFromItem({
            category: item.category,
            title,
            summary: excerpt,
            slug,
            sentiment: item.sentiment
          }),
          title: title || (locale === "zh" ? "要点整理" : "Insight update"),
          excerpt,
          readingTime,
          popularity,
          publishedAt: formatDate(item.publishedAt),
          publishedAtTs,
          tags
        };
      });
      ensurePillarCoverage(previews);
    }
  } catch {
    // ignore fetch failures
  }

  return (
    <div className="space-y-10">
      <PageHero
        locale={locale}
        eyebrow={tCommon(locale === "en" ? "brandEn" : "brandCn")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        highlights={highlights}
        ctas={[
          { href: "/framework", label: t("hero.cta.primary"), variant: "secondary" },
          { href: "/programs", label: t("hero.cta.secondary"), variant: "secondary" }
        ]}
        riskNote={t("hero.risk")}
      />

      <InsightsExplorer posts={previews} />
    </div>
  );
}
