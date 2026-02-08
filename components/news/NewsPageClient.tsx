"use client";

import React from "react";
import dynamic from "next/dynamic";

import { type Filters } from "./FiltersPanel";

const NewsFeed = dynamic(
  () => import("./NewsFeed").then((mod) => mod.NewsFeed),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
      </div>
    )
  }
);

const HotNewsPanel = dynamic(
  () => import("./RightRail").then((mod) => mod.HotNewsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-amber-300" />
      </div>
    )
  }
);

const EconCalendarPanel = dynamic(
  () => import("./RightRail").then((mod) => mod.EconCalendarPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
      </div>
    )
  }
);

export function NewsPageClient({
  locale,
  initialItems = [],
  initialTotal = 0,
  initialRange = "today",
  initialHotItems = []
}: {
  locale: "zh" | "en";
  initialItems?: any[];
  initialTotal?: number;
  initialRange?: Filters["range"];
  initialHotItems?: any[];
}) {
  const [feedReady, setFeedReady] = React.useState(false);
  const [feedItems, setFeedItems] = React.useState<any[]>(initialItems);
  const maskVisible = !feedReady;
  const filters = React.useMemo<Filters>(
    () => ({
      category: "all",
      importance: "all",
      range: initialRange ?? "today",
      symbol: "",
      q: ""
    }),
    [initialRange]
  );
  const hotSeedItems = initialHotItems.length ? initialHotItems : feedItems;

  React.useEffect(() => {
    setFeedReady(false);
  }, [locale]);

  React.useEffect(() => {
    if (feedReady) return;
    if (!feedItems.length) return;
    const id = window.setTimeout(() => setFeedReady(true), 1200);
    return () => window.clearTimeout(id);
  }, [feedItems.length, feedReady]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-auto">
      <div className="grid h-full min-h-0 min-w-[960px] grid-cols-[minmax(0,3.2fr)_minmax(0,0.6fr)_minmax(0,0.6fr)] gap-4">
        <section className="h-full min-h-0 min-w-0">
          <NewsFeed
            locale={locale}
            filters={filters}
            initialItems={initialItems}
            initialTotal={initialTotal}
            initialRange={initialRange}
            onReady={() => setFeedReady(true)}
            onItems={(items) => {
              if (items.length) {
                setFeedItems((prev) => (prev.length ? prev : items));
              }
            }}
          />
        </section>

        <aside className="h-full min-h-0 min-w-0">
          <HotNewsPanel
            locale={locale}
            className="h-full"
            initialItems={hotSeedItems}
          />
        </aside>

        <aside className="h-full min-h-0 min-w-0">
          <EconCalendarPanel
            locale={locale}
            className="h-full"
          />
        </aside>
      </div>

      {maskVisible ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-white/80 shadow-xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
            <div className="text-sm">
              {locale === "zh" ? "获取新闻中..." : "Fetching news data..."}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

