"use client";

import React from "react";

import { useDebounce } from "@/lib/hooks/useDebounce";
import { computeHeat } from "@/lib/news/heat";

import type { Filters } from "./FiltersPanel";
import { NewsCard } from "./NewsCard";

const PAGE_SIZE = 36;

export function NewsFeed({
  locale,
  filters,
  initialItems = [],
  initialTotal = 0,
  initialRange,
  onReady,
  onItems
}: {
  locale: "zh" | "en";
  filters: Filters;
  initialItems?: any[];
  initialTotal?: number;
  initialRange?: Filters["range"];
  onReady?: () => void;
  onItems?: (items: any[]) => void;
}) {
  const allowFast = locale === "en";
  const [page, setPage] = React.useState(initialItems.length ? 1 : 0);
  const [items, setItems] = React.useState<any[]>(() => {
    const withHeat = initialItems.map((item: any) => ({
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
    return withHeat;
  });
  const [loading, setLoading] = React.useState(initialItems.length === 0);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(() => {
    if (initialItems.length === 0) return true;
    if (Number(initialTotal || 0) > initialItems.length) return true;
    return initialItems.length >= PAGE_SIZE;
  });
  const usedInitialRef = React.useRef(false);
  const refreshOnceRef = React.useRef(false);
  const readyRef = React.useRef(false);
  const sentItemsRef = React.useRef(false);

  const q = useDebounce(filters.q, 350);
  const symbol = useDebounce(filters.symbol, 350);

  const controllerRef = React.useRef<AbortController | null>(null);

  const buildQuery = React.useCallback(
    (p: number, opts?: { range?: Filters["range"]; fast?: boolean }) => {
      const params = new URLSearchParams();
      params.set("locale", locale);
      params.set("page", String(p));
      params.set("pageSize", String(PAGE_SIZE));
      params.set("category", filters.category);
      params.set("importance", filters.importance);
      params.set("range", opts?.range ?? filters.range);
      const useFast = Boolean(opts?.fast) && allowFast;
      if (useFast) params.set("fast", "1");
      if (symbol.trim()) params.set("symbol", symbol.trim().toUpperCase());
      if (q.trim()) params.set("q", q.trim());
      return params.toString();
    },
    [locale, filters.category, filters.importance, filters.range, q, symbol, allowFast]
  );

  const markReady = React.useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  const load = React.useCallback(
    async (
      p: number,
      reset = false,
      opts?: { range?: Filters["range"]; keepIfEmpty?: boolean; fast?: boolean }
    ) => {
      let aborted = false;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(p, opts);
        const res = await fetch(`/api/news/list?${query}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const json = await res.json();

        if (!json?.ok) {
          setError(json?.error || "load_failed");
          setItems((prev) => (reset && !opts?.keepIfEmpty ? [] : prev));
          setHasMore(false);
          return;
        }

        const next = Array.isArray(json.items) ? json.items : [];
        const withHeat = next.map((item: any) => ({
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
        setItems((prev) => {
          if (!reset) return [...prev, ...withHeat];
          if (opts?.keepIfEmpty && next.length === 0) return prev;
          return withHeat;
        });
        setHasMore(next.length >= PAGE_SIZE);
        setPage(p);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          aborted = true;
          return;
        }
        setError("network_error");
        setHasMore(false);
      } finally {
        setLoading(false);
        if (!aborted) markReady();
      }
    },
    [buildQuery, markReady]
  );

  const queryKey = React.useMemo(() => buildQuery(1), [buildQuery]);
  const initialRangeValue = initialRange ?? filters.range;
  React.useEffect(() => {
    setPage(1);
    if (!usedInitialRef.current && initialItems.length) {
      usedInitialRef.current = true;
      setItems(
        initialItems.map((item: any) => ({
          ...item,
          heat: typeof item.heat === "number"
            ? item.heat
            : computeHeat({
                id: item.id,
                publishedAt: item.publishedAt,
                views: item.views,
                clicks: item.clicks
              })
        }))
      );
      setHasMore(Number(initialTotal || 0) > initialItems.length || initialItems.length >= PAGE_SIZE);
      setLoading(false);
      setError(null);
      markReady();
      if (!refreshOnceRef.current && !allowFast) {
        refreshOnceRef.current = true;
        void load(1, true, { range: filters.range, keepIfEmpty: true, fast: false });
      }
      return;
    }
    setHasMore(true);
    void load(1, true, { keepIfEmpty: true, fast: allowFast });
  }, [
    queryKey,
    load,
    initialItems,
    initialTotal,
    initialRangeValue,
    filters.range,
    allowFast,
    markReady
  ]);

  React.useEffect(() => {
    if (sentItemsRef.current) return;
    if (!items.length) return;
    sentItemsRef.current = true;
    onItems?.(items);
  }, [items, onItems]);

  const sentinel = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading && !error) {
          load(page + 1, false, { fast: allowFast });
        }
      },
      { root: scrollRef.current, rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, error, load, page, allowFast]);

  const onClickReadMore = async (articleId: string) => {
    await fetch("/api/news/metrics/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ articleId })
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-white/80">
            {locale === "zh" ? "加载失败，请稍后重试。" : "Failed to load. Please retry."}
            <button
              type="button"
              className="ml-3 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5"
              onClick={() => load(1, true, { fast: allowFast })}
            >
              {locale === "zh" ? "重试" : "Retry"}
            </button>
          </div>
        ) : null}

        {items.map((item) => (
          <NewsCard
            key={item.id}
            locale={locale}
            item={item}
            onClickReadMore={onClickReadMore}
          />
        ))}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
            {locale === "zh" ? "加载中..." : "Loading..."}
          </div>
        ) : null}

        {!items.length && !loading && !error ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            {locale === "zh" ? "暂无新闻，请稍后刷新。" : "No items yet. Please refresh later."}
          </div>
        ) : null}

        <div ref={sentinel} />
      </div>
    </div>
  );
}
