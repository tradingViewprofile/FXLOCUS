"use client";

import React from "react";

import { useMarket } from "../../context/MarketContext";
import { TradingViewTimeline } from "../../widgets/TradingViewTimeline";

type NewsItem = {
  id: string;
  title: string;
  titleLocalized?: string;
  link: string;
  source: string;
  publishedAt?: string;
};

export function NewsTab() {
  const { locale, instrument } = useMarket();
  const [items, setItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const url = `/api/news/related?symbol=${encodeURIComponent(
          instrument.symbolCode
        )}&locale=${locale}`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`news ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (error: any) {
        if (!alive || error?.name === "AbortError") return;
        setErr(error?.message || "news error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [instrument.symbolCode, locale]);

  const hasItems = items.length > 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <div className="text-white/85 font-semibold">
            {locale === "zh" ? "相关新闻" : "Related News"}
          </div>
          <div className="text-xs text-white/50">
            {loading ? (locale === "zh" ? "加载中..." : "Loading...") : null}
            {err ? ` · ${err}` : null}
          </div>
        </div>

        {hasItems ? (
          <div className="mt-3 space-y-2">
            {items.slice(0, 12).map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
              >
                <div className="line-clamp-2 text-sm font-semibold text-white/85">
                  {locale === "zh" ? item.titleLocalized || item.title : item.title}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  {item.source}
                  {item.publishedAt
                    ? ` · ${new Date(item.publishedAt).toLocaleString()}`
                    : ""}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-white/60">
            {locale === "zh"
              ? "暂无可用 RSS 新闻，自动显示 TradingView 新闻时间线（兜底）。"
              : "RSS unavailable. Showing TradingView timeline fallback."}
          </div>
        )}
      </div>

      {!hasItems ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <TradingViewTimeline tvSymbol={instrument.tvSymbol} locale={locale} />
        </div>
      ) : null}
    </div>
  );
}
