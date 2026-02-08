"use client";

import React from "react";

import { TradingViewWidget } from "@/components/markets/widgets/TradingViewWidget";

export function MiniChartWidget({ symbol, locale }: { symbol: string; locale: "zh" | "en" }) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
      depsKey={`mini:${symbol}:${locale}`}
      height={220}
      options={{
        symbol,
        width: "100%",
        height: 220,
        locale: locale === "zh" ? "zh_CN" : "en",
        dateRange: "1M",
        colorTheme: "dark",
        isTransparent: true,
        autosize: true
      }}
    />
  );
}
