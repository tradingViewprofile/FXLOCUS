import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale; slug: string };
};

export const revalidate = 120;

const FETCH_TIMEOUT_MS = 1800;

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

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function fetchArticle(locale: "zh" | "en", slug: string) {
  const baseUrl = resolveBaseUrl();
  const query = new URLSearchParams({ locale, slug });
  const json = await fetchJsonWithTimeout(
    `${baseUrl}/api/news/detail?${query.toString()}`,
    { next: { revalidate: 120 } },
    FETCH_TIMEOUT_MS
  );
  if (!json?.ok || !json?.article) return null;
  return json.article as {
    id: string;
    slug: string;
    url?: string;
    source?: string;
    publishedAt?: string;
    category?: string;
    importance?: string;
    sentiment?: string;
    symbols?: string[];
    title: string;
    summary?: string;
    content?: string;
    keyPoints?: string[];
    lens?: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale === "en" ? "en" : "zh";
  const article = await fetchArticle(locale, params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary || article.content || ""
  };
}

export default async function InsightDetailPage({ params }: Props) {
  const locale = params.locale === "en" ? "en" : "zh";
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const t = await getTranslations({ locale, namespace: "insights" });

  const article = await fetchArticle(locale, params.slug);
  if (article?.url) redirect(article.url);
  if (!article) notFound();

  const keyPoints = Array.isArray(article.keyPoints) ? article.keyPoints : [];
  const tags = Array.isArray(article.symbols) ? article.symbols : [];
  const content = article.content || article.summary || "";

  return (
    <div className="space-y-12">
      <header className="pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/70">
          <span className="fx-pill">{article.category || (locale === "zh" ? "市场" : "Market")}</span>
          <span>{formatDate(article.publishedAt)}</span>
          {article.source ? (
            <>
              <span>·</span>
              <span>{article.source}</span>
            </>
          ) : null}
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {article.title}
        </h1>
        {article.summary ? <p className="fx-lead">{article.summary}</p> : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/insights" locale={locale} className="fx-btn fx-btn-secondary">
            {tCommon("cta.back")}
          </Link>
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="fx-btn fx-btn-secondary"
            >
              {locale === "zh" ? "阅读原文" : "Read original"}
            </a>
          ) : null}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="fx-card p-7">
          <div className="text-sm leading-7 text-slate-200/80 whitespace-pre-wrap">{content}</div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {keyPoints.length ? (
            <div className="fx-card p-6">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {t("detail.keyPoints")}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200/75">
                {keyPoints.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {article.lens ? (
            <div className="fx-card p-6">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {locale === "zh" ? "FxLocus视角" : "FxLocus lens"}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200/75">{article.lens}</p>
            </div>
          ) : null}

          {tags.length ? (
            <div className="fx-card p-6">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {locale === "zh" ? "相关品种" : "Symbols"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.slice(0, 8).map((tag) => (
                  <span key={tag} className="fx-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
