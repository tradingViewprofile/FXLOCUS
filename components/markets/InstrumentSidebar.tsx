"use client";

import React from "react";

import { Instrument, useMarket } from "./context/MarketContext";

const categories: { key: Instrument["category"]; zh: string; en: string }[] = [
  { key: "all", zh: "全部", en: "All" },
  { key: "fx_direct", zh: "直盘", en: "Majors (USD)" },
  { key: "fx_cross", zh: "交叉盘", en: "Crosses" },
  { key: "metals", zh: "贵金属", en: "Metals" },
  { key: "crypto", zh: "加密货币", en: "Crypto" },
  { key: "indices", zh: "指数", en: "Indices" },
  { key: "commodities", zh: "大宗商品", en: "Commodities" },
  { key: "stocks", zh: "股票", en: "Stocks" }
];

function label(locale: "zh" | "en", zh: string, en: string) {
  return locale === "zh" ? zh : en;
}

function norm(value: string) {
  return (value || "").toUpperCase().replace(/\s+/g, "").replace(/[\/:\-_.]/g, "");
}

function matchInstrument(item: Instrument, query: string) {
  const nq = norm(query);
  const symbol = norm(item.symbolCode || "");
  const tv = norm(item.tvSymbol || "");
  const zh = norm(item.nameZh || "");
  const en = norm(item.nameEn || "");

  const raw = String(item.symbolCode || "");
  const [baseRaw, quoteRaw] = raw.split("/");
  const base = norm(baseRaw || "");
  const quote = norm(quoteRaw || "");

  return (
    symbol.includes(nq) ||
    tv.includes(nq) ||
    zh.includes(nq) ||
    en.includes(nq) ||
    base.includes(nq) ||
    quote.includes(nq)
  );
}

type Props = {
  onCollapse?: () => void;
  collapseLabel?: string;
  collapseHint?: string;
  onReady?: () => void;
};

export function InstrumentSidebar({
  onCollapse,
  collapseLabel,
  collapseHint,
  onReady
}: Props) {
  const { locale, instrument, setInstrument } = useMarket();
  const collapseText = collapseLabel ?? (locale === "zh" ? "收起" : "Collapse");
  const collapseTitle = collapseHint ?? (locale === "zh" ? "收起品种栏" : "Collapse instruments");

  const [category, setCategory] = React.useState<Instrument["category"]>("all");
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Instrument[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const readyRef = React.useRef(false);

  const loadPage = React.useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/markets/universe?category=${category}&page=${nextPage}&pageSize=80`,
          { cache: "no-store" }
        );
        const json = await res.json();
        const nextItems = (json.items || []) as Instrument[];
        setItems((prev) => (nextPage === 1 ? nextItems : [...prev, ...nextItems]));
        const total = Number(json.total || 0);
        const pageSize = Number(json.pageSize || 80);
        setHasMore(nextPage * pageSize < total);
        setPage(nextPage);
      } catch {
        // ignore load errors
      } finally {
        setLoading(false);
        if (nextPage === 1 && !readyRef.current) {
          readyRef.current = true;
          onReady?.();
        }
      }
    },
    [category, onReady]
  );

  React.useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadPage(1);
  }, [category, loadPage]);

  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!hasMore || loading) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        loadPage(page + 1);
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loading, loadPage, page]);

  const trimmedQuery = query.trim();
  const showing = React.useMemo(() => {
    if (!trimmedQuery) return items;
    return items.filter((item) => matchInstrument(item, trimmedQuery));
  }, [items, trimmedQuery]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-white/85 font-semibold">
            {locale === "zh" ? "品种" : "Instruments"}
          </div>
          {onCollapse ? (
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/75 hover:bg-white/10"
              onClick={onCollapse}
              title={collapseTitle}
            >
              {collapseText}
            </button>
          ) : null}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            locale === "zh" ? "搜索：代码/名称（分类内）" : "Search symbol/name (in category)"
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={[
                "rounded-xl border px-3 py-1.5 text-sm transition",
                category === cat.key
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/0 text-white/70 hover:bg-white/5"
              ].join(" ")}
            >
              {label(locale, cat.zh, cat.en)}
            </button>
          ))}
        </div>

        <div className="mt-2 text-xs text-white/45">
          {trimmedQuery
            ? locale === "zh"
              ? "在当前分类内筛选"
              : "Filtering within the current category"
            : locale === "zh"
              ? "分类列表支持滚动加载"
              : "Category list supports infinite loading"}
        </div>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-2">
        {showing.map((item) => (
          <button
            key={item.id}
            onClick={() => setInstrument(item)}
            className={[
              "mb-2 w-full rounded-xl border px-3 py-2 text-left transition",
              instrument.tvSymbol === item.tvSymbol
                ? "border-white/20 bg-white/10"
                : "border-white/10 bg-white/0 hover:bg-white/5"
            ].join(" ")}
          >
            <div className="text-sm font-semibold text-white/90">{item.symbolCode}</div>
            <div className="mt-0.5 text-xs text-white/55">
              {locale === "zh" ? item.nameZh || item.nameEn || "" : item.nameEn || item.nameZh || ""}
            </div>
            <div className="mt-1 text-[11px] text-white/35">{item.tvSymbol}</div>
          </button>
        ))}

        {!showing.length ? (
          <div className="p-3 text-sm text-white/60">
            {locale === "zh" ? "暂无数据（尝试搜索或切换分类）" : "No items. Try search or change category."}
          </div>
        ) : null}

        {!trimmedQuery && loading ? (
          <div className="p-3 text-sm text-white/45">{locale === "zh" ? "加载中..." : "Loading..."}</div>
        ) : null}
      </div>
    </div>
  );
}
