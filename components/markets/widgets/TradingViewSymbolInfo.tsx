"use client";

import { Locale } from "../context/MarketContext";
import { TradingViewWidget } from "./TradingViewWidget";

export function TradingViewSymbolInfo({
  tvSymbol,
  locale
}: {
  tvSymbol: string;
  locale: Locale;
}) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
      depsKey={`${tvSymbol}:${locale}`}
      height={260}
      options={{
        symbol: tvSymbol,
        width: "100%",
        locale: locale === "zh" ? "zh_CN" : "en",
        colorTheme: "dark",
        isTransparent: true
      }}
    />
  );
}
