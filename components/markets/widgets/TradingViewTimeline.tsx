"use client";

import { Locale } from "../context/MarketContext";
import { TradingViewWidget } from "./TradingViewWidget";

export function TradingViewTimeline({
  tvSymbol,
  locale
}: {
  tvSymbol: string;
  locale: Locale;
}) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
      depsKey={`${tvSymbol}:${locale}`}
      height={420}
      options={{
        feedMode: "symbol",
        symbol: tvSymbol,
        colorTheme: "dark",
        isTransparent: true,
        displayMode: "adaptive",
        width: "100%",
        height: 420,
        locale: locale === "zh" ? "zh_CN" : "en"
      }}
    />
  );
}
