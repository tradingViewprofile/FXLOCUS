"use client";

import { Locale } from "../context/MarketContext";
import { TradingViewWidget } from "./TradingViewWidget";

export function TradingViewTechnicalAnalysis({
  tvSymbol,
  locale
}: {
  tvSymbol: string;
  locale: Locale;
}) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
      depsKey={`${tvSymbol}:${locale}`}
      height={420}
      options={{
        interval: "1h",
        width: "100%",
        isTransparent: true,
        height: 420,
        symbol: tvSymbol,
        showIntervalTabs: true,
        displayMode: "single",
        locale: locale === "zh" ? "zh_CN" : "en",
        colorTheme: "dark"
      }}
    />
  );
}
