"use client";

import React from "react";

import { useMarket } from "../../context/MarketContext";
import { TradingViewSymbolInfo } from "../../widgets/TradingViewSymbolInfo";

export function StatsTab() {
  const { locale, instrument } = useMarket();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "统计（同源数据）" : "Stats (Same Source)"}
        </div>
        <div className="ml-auto text-xs text-white/45">{instrument.symbolCode}</div>
      </div>

      <div className="mt-2 text-xs text-white/50">
        {locale === "zh"
          ? "来源：TradingView 同一标的统计数据。"
          : "Source: TradingView same symbol stats."}
      </div>

      <div className="mt-3">
        <TradingViewSymbolInfo tvSymbol={instrument.tvSymbol} locale={locale} />
      </div>
    </div>
  );
}
