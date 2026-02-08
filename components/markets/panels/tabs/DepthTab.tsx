"use client";

import React from "react";

import { useMarket } from "../../context/MarketContext";
import { TradingViewSymbolInfo } from "../../widgets/TradingViewSymbolInfo";

export function DepthTab() {
  const { locale, instrument } = useMarket();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white/85 font-semibold">
        {locale === "zh" ? "盘口与报价（同源）" : "Quote (Same Source)"}
      </div>
      <div className="mt-2 text-xs text-white/50">
        {locale === "zh"
          ? "来源：TradingView 同一标的行情数据。"
          : "Source: TradingView same symbol feed."}
      </div>
      <div className="mt-3">
        <TradingViewSymbolInfo tvSymbol={instrument.tvSymbol} locale={locale} />
      </div>
    </div>
  );
}
