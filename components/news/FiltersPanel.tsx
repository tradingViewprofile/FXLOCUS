"use client";

import React from "react";

export type Filters = {
  category: "all" | "fx" | "stocks" | "commodities" | "crypto" | "macro";
  importance: "all" | "high" | "medium" | "low";
  range: "today" | "yesterday" | "week" | "month";
  symbol: string;
  q: string;
};

const DEFAULTS: Filters = {
  category: "all",
  importance: "all",
  range: "today",
  symbol: "",
  q: ""
};

const QUICK_SYMBOLS = ["EURUSD", "USDJPY", "GBPUSD", "XAUUSD", "BTCUSD", "USOIL"];

const QUICK_TOPICS: Record<"zh" | "en", string[]> = {
  zh: ["CPI", "非农", "FOMC", "加息", "GDP", "央行"],
  en: ["CPI", "NFP", "FOMC", "Rate", "GDP", "Central Bank"]
};

export function FiltersPanel({
  locale,
  value,
  onChange
}: {
  locale: "zh" | "en";
  value: Filters;
  onChange: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  const set = React.useCallback(
    (patch: Partial<Filters>) =>
      onChange((prev) => ({
        ...prev,
        ...patch
      })),
    [onChange]
  );

  const categories = [
    ["all", locale === "zh" ? "全部" : "All"],
    ["fx", locale === "zh" ? "外汇" : "FX"],
    ["stocks", locale === "zh" ? "股票" : "Stocks"],
    ["commodities", locale === "zh" ? "商品" : "Commodities"],
    ["crypto", locale === "zh" ? "加密货币" : "Crypto"],
    ["macro", locale === "zh" ? "经济数据" : "Macro"]
  ] as const;

  const importance = [
    ["all", locale === "zh" ? "全部" : "All"],
    ["high", locale === "zh" ? "高" : "High"],
    ["medium", locale === "zh" ? "中" : "Medium"],
    ["low", locale === "zh" ? "低" : "Low"]
  ] as const;

  const ranges = [
    ["today", locale === "zh" ? "今日" : "Today"],
    ["yesterday", locale === "zh" ? "昨日" : "Yesterday"],
    ["week", locale === "zh" ? "本周" : "This week"],
    ["month", locale === "zh" ? "本月" : "This month"]
  ] as const;

  const btn = (active: boolean) =>
    active
      ? "bg-white/15 border-white/30 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
      : "bg-white/0 border-white/10 text-white/70 hover:bg-white/10 hover:text-white";

  const activeTags = [
    value.category !== "all" ? categories.find(([key]) => key === value.category)?.[1] : null,
    value.importance !== "all"
      ? importance.find(([key]) => key === value.importance)?.[1]
      : null,
    value.range !== "today" ? ranges.find(([key]) => key === value.range)?.[1] : null,
    value.symbol ? value.symbol : null,
    value.q ? value.q : null
  ].filter(Boolean) as string[];

  return (
    <div className="pointer-events-auto flex h-full min-h-0 flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white/90">
            {locale === "zh" ? "筛选" : "Filters"}
          </div>
          <div className="mt-1 text-xs text-white/50">
            {locale === "zh"
              ? "按分类、重要性与时间范围筛选新闻。"
              : "Filter by category, importance, and time range."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULTS)}
          style={{width:100}}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
        >
          {locale === "zh" ? "重置" : "Reset"}
        </button>
      </div>

      <div>
        <div className="mb-2 text-xs text-white/50">
          {locale === "zh" ? "搜索关键词" : "Keyword Search"}
        </div>
        <input
          value={value.q}
          onChange={(event) => set({ q: event.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "关键词 / 标题" : "Keyword / title"}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_TOPICS[locale].map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => set({ q: topic })}
              className="fx-tab rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:border-white/30 hover:bg-white/10"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-white/50">{locale === "zh" ? "关联品种" : "Symbol"}</div>
        <input
          value={value.symbol}
          onChange={(event) => set({ symbol: event.target.value.toUpperCase() })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "例如：EURUSD / XAUUSD" : "e.g. EURUSD / XAUUSD"}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => set({ symbol })}
              className="fx-tab rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70 hover:border-white/30 hover:bg-white/10"
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-white/50">{locale === "zh" ? "分类" : "Category"}</div>
        <div className="flex flex-wrap gap-2">
          {categories.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ category: key })}
              className={`fx-tab rounded-xl border px-3 py-1.5 text-sm ${btn(value.category === key)}${
                value.category === key ? " fx-tab-active" : ""
              }`}
              aria-pressed={value.category === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-white/50">{locale === "zh" ? "重要性" : "Importance"}</div>
        <div className="flex flex-wrap gap-2">
          {importance.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ importance: key })}
              className={`fx-tab rounded-xl border px-3 py-1.5 text-sm ${btn(value.importance === key)}${
                value.importance === key ? " fx-tab-active" : ""
              }`}
              aria-pressed={value.importance === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-white/50">{locale === "zh" ? "时间范围" : "Range"}</div>
        <div className="flex flex-wrap gap-2">
          {ranges.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ range: key })}
              className={`fx-tab rounded-xl border px-3 py-1.5 text-sm ${btn(value.range === key)}${
                value.range === key ? " fx-tab-active" : ""
              }`}
              aria-pressed={value.range === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/65">
        <div className="text-white/80">{locale === "zh" ? "当前筛选" : "Active Filters"}</div>
        {activeTags.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-white/45">
            {locale === "zh" ? "全部新闻" : "All news"}
          </div>
        )}
      </div>

      <div className="mt-auto text-xs leading-6 text-white/45">
        {locale === "zh"
          ? "提示：列表实时更新。付费媒体默认仅标题/链接，避免侵权。"
          : "Realtime updates. Paid sources are metadata-only by default."}
      </div>
    </div>
  );
}
