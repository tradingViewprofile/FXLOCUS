"use client";

import React from "react";
import dynamic from "next/dynamic";

import { computeHeat } from "@/lib/news/heat";

const EconCalendarWidget = dynamic(
  () => import("./EconCalendarWidget").then((mod) => mod.EconCalendarWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
      </div>
    )
  }
);

function FlameIcon({
  className = "",
  size
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3c2.5 3.2 2.8 5.7 1.1 8.2-.9 1.3-1.5 2.2-1.5 3.8 0 2 1.6 3.7 3.7 3.7 3.1 0 5.2-2.7 4.7-6.4-.3-2.3-1.6-4.4-3.2-6.4" />
      <path d="M8.3 7.2c-.7 1.5-2 2.6-2.6 4.3-.8 2.3-.2 5.3 1.7 7 1.2 1.1 2.9 1.8 4.6 1.8" />
    </svg>
  );
}

function cleanText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<+\s*sep\s*>+/gi, "")
    .replace(/[<>]+/g, "")
    .trim();
}

type PanelProps = {
  locale: "zh" | "en";
  className?: string;
};

type HotNewsPanelProps = PanelProps & {
  initialItems?: any[];
  onReady?: () => void;
};

function withHeat(items: any[]) {
  const next = items.map((item: any) => ({
    ...item,
    heat: typeof item.heat === "number"
      ? item.heat
      : computeHeat({
          id: item.id,
          publishedAt: item.publishedAt,
          views: item.views,
          clicks: item.clicks
        })
  }));
  next.sort((a: any, b: any) => (b.heat || 0) - (a.heat || 0));
  return next;
}

export function HotNewsPanel({
  locale,
  className = "",
  initialItems = [],
  onReady
}: HotNewsPanelProps) {
  const [hot, setHot] = React.useState<any[]>(() => withHeat(initialItems).slice(0, 12));
  const [error, setError] = React.useState<string | null>(null);
  const readyRef = React.useRef(false);
  const markReady = React.useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);
  const seededRef = React.useRef(false);

  const onClickHot = React.useCallback((articleId: string) => {
    void fetch("/api/news/metrics/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articleId })
    });
  }, []);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const fastParam = locale === "en" ? "&fast=1" : "";
        const res = await fetch(
          `/api/news/list?locale=${locale}&range=week&page=1&pageSize=20&category=all&importance=all${fastParam}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!json?.ok) {
          if (alive) setError(json?.error || "load_failed");
          return;
        }
        const items = Array.isArray(json.items) ? json.items : [];
        const ranked = withHeat(items);
        if (alive) {
          setHot((prev) => (ranked.length ? ranked.slice(0, 12) : prev));
          setError(null);
        }
        if (alive) markReady();
      } catch (err: any) {
        if (alive) setError(err?.message || "network_error");
        if (alive) markReady();
      }
    };

    const id = window.setTimeout(() => void load(), 60);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [locale, markReady]);

  React.useEffect(() => {
    if (seededRef.current) return;
    if (!initialItems.length) return;
    seededRef.current = true;
    setHot((prev) => (prev.length ? prev : withHeat(initialItems).slice(0, 12)));
    markReady();
  }, [initialItems, markReady]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="fx-card flex h-full flex-col rounded-2xl p-4">
        <div className="flex items-center gap-2 text-white/85 font-semibold">
          <FlameIcon className="h-4 w-4 text-amber-400" />
          <span>
            {locale === "zh" ? "\u70ed\u95e8\u65b0\u95fb" : "Hot News"}
          </span>
        </div>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {error && hot.length === 0 ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-white/70">
              {locale === "zh" ? "\u70ed\u95e8\u52a0\u8f7d\u5931\u8d25" : "Failed to load trending"}
            </div>
          ) : hot.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              {locale === "zh" ? "\u6682\u65e0\u70ed\u95e8\u6570\u636e" : "No trending items yet."}
            </div>
          ) : (
            (() => {
              const heatValues = hot.map((entry: any) => Number(entry.heat ?? entry.views ?? 0));
              const maxHeat = heatValues.length ? Math.max(...heatValues) : 0;
              const minHeat = heatValues.length ? Math.min(...heatValues) : 0;
              const span = Math.max(1, maxHeat - minHeat);
              return hot.map((item: any, idx: number) => {
                const heat = Number(item.heat ?? item.views ?? 0);
                const ratio = Math.min(1, Math.max(0, (heat - minHeat) / span));
                const rankRatio = hot.length > 1 ? 1 - idx / (hot.length - 1) : 1;
                const flameSize = 12 + Math.max(ratio, rankRatio) * 8;
                return (
                  <div
                    key={item.id}
                    className="block rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                  >
                    <div className="flex items-start gap-2">
                      <FlameIcon className="mt-0.5 text-amber-400" size={flameSize} />
                      <div className="line-clamp-2 text-sm font-semibold text-white/85">
                        {cleanText(String(item.title || ""))}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                      <span>
                        {locale === "zh" ? "\u70ed\u5ea6" : "Heat"}: {item.heat ?? item.views ?? 0}
                      </span>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => onClickHot(item.id)}
                          className="fx-btn fx-btn-secondary ml-auto rounded-lg px-2 py-1 text-[11px]"
                        >
                          {locale === "zh" ? "\u9605\u8bfb\u5168\u6587" : "Read original"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>
    </div>
  );
}

export function EconCalendarPanel({
  locale,
  className = "",
  onReady
}: PanelProps & { onReady?: () => void }) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const readyRef = React.useRef(false);
  const markReady = React.useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="fx-card flex h-full flex-col rounded-2xl p-4">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "\u5b9e\u65f6\u7ecf\u6d4e\u65e5\u5386" : "Economic Calendar"}
        </div>
        <div className="relative mt-3 min-h-0 flex-1 overflow-hidden">
          <EconCalendarWidget
            locale={locale}
            onStatusChange={(next) => {
              setStatus(next);
              if (next !== "loading") markReady();
            }}
          />
          {status !== "ready" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-xs text-white/70">
              {status === "error"
                ? locale === "zh"
                  ? "\u65e5\u5386\u52a0\u8f7d\u5931\u8d25"
                  : "Calendar failed to load"
                : locale === "zh"
                  ? "\u65e5\u5386\u52a0\u8f7d\u4e2d..."
                  : "Loading calendar..."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RightRail({ locale }: { locale: "zh" | "en" }) {
  return (
    <div className="space-y-3">
      <HotNewsPanel locale={locale} />

      <EconCalendarPanel locale={locale} />

      <div className="fx-card rounded-2xl p-4">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "\u5173\u8054\u8bfe\u7a0b\u63a8\u8350" : "Recommended Courses"}
        </div>
        <div className="mt-2 text-sm leading-6 text-white/70">
          {locale === "zh"
            ? "\uff08\u5360\u4f4d\uff09\u6309\u65b0\u95fb\u7684\u5206\u7c7b\u4e0e\u54c1\u79cd\u63a8\u8350\u8bfe\u7a0b\u4e0e\u6587\u7ae0\uff0c\u63a5\u5165\u8bfe\u7a0b\u5e93\u540e\u81ea\u52a8\u66ff\u6362\u4e3a\u771f\u5b9e\u63a8\u8350\u3002"
            : "(Placeholder) Recommend courses/articles by category and symbols once course DB is connected."}
        </div>
      </div>
    </div>
  );
}
