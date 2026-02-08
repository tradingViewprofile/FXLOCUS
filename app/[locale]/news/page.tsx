import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { NewsPageClient } from "@/components/news/NewsPageClient";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("newsTitle"),
    description: t("newsDesc")
  };
}

export const revalidate = 60;

const NEWS_REVALIDATE = 60;
const PAGE_SIZE = 36;
const HOT_PAGE_SIZE = 12;
const FETCH_TIMEOUT_MS = 1500;

function resolveBaseUrl() {
  const headerList = headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host.replace(/\/$/, "")}`;
  const configured = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
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
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function NewsPage({ params }: Props) {
  const locale = params.locale === "en" ? "en" : "zh";
  const baseUrl = resolveBaseUrl();
  const fetchOptions = { next: { revalidate: NEWS_REVALIDATE } };
  const baseParams: Record<string, string> = {
    locale,
    page: "1",
    pageSize: String(PAGE_SIZE),
    category: "all",
    importance: "all"
  };
  baseParams.fast = "1";
  const hotParams: Record<string, string> = {
    ...baseParams,
    pageSize: String(HOT_PAGE_SIZE)
  };
  let initialItems: any[] = [];
  let initialTotal = 0;
  let initialRange: "today" | "yesterday" | "week" = "today";
  let initialHotItems: any[] = [];

  const fetchRange = async (range: "today" | "yesterday" | "week", size = String(PAGE_SIZE)) => {
    const query = new URLSearchParams({ ...baseParams, range, pageSize: size }).toString();
    return fetchJsonWithTimeout(`${baseUrl}/api/news/list?${query}`, fetchOptions, FETCH_TIMEOUT_MS);
  };

  const fetchHotRange = async (range: "yesterday" | "week") => {
    const query = new URLSearchParams({ ...hotParams, range }).toString();
    return fetchJsonWithTimeout(`${baseUrl}/api/news/list?${query}`, fetchOptions, FETCH_TIMEOUT_MS);
  };

  try {
    const [json, hotJson] = await Promise.all([
      fetchRange("today"),
      fetchHotRange("week")
    ]);
    if (json?.ok) {
      initialItems = Array.isArray(json.items) ? json.items : [];
      initialTotal = Number(json.total || 0);
    }
    if (hotJson?.ok) {
      initialHotItems = Array.isArray(hotJson.items) ? hotJson.items : [];
    }
  } catch {
    // ignore initial fetch failures
  }

  return (
    <NewsPageClient
      locale={locale}
      initialItems={initialItems}
      initialTotal={initialTotal}
      initialRange={initialRange}
      initialHotItems={initialHotItems}
    />
  );
}
