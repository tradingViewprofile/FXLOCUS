"use client";

import React from "react";

import { Locale } from "../context/MarketContext";
import { TradingViewWidget } from "./TradingViewWidget";

export function TradingViewAdvancedChart({
  tvSymbol,
  locale,
  rebuildKey,
  onStatusChange
}: {
  tvSymbol: string;
  locale: Locale;
  rebuildKey: string;
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
}) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
      depsKey={`${tvSymbol}:${locale}:${rebuildKey}`}
      className="h-full w-full"
      onStatusChange={onStatusChange}
      options={{
        autosize: true,
        symbol: tvSymbol,
        interval: "60",
        timezone: "Asia/Shanghai",
        theme: "dark",
        style: "1",
        locale: locale === "zh" ? "zh_CN" : "en",
        allow_symbol_change: true,
        save_image: true,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        enable_publishing: false,
        studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
        overrides: {
          "paneProperties.topMargin": 6,
          "paneProperties.bottomMargin": 6,
          "mainSeriesProperties.priceAxisProperties.logarithmic": false,
          "mainSeriesProperties.priceAxisProperties.percentage": false,
          "mainSeriesProperties.priceAxisProperties.indexedTo100": false,
          "scalesProperties.showSeriesLastValue": true,
          "scalesProperties.showStudyLastValue": true,
          "scalesProperties.showSymbolLabels": true
        }
      }}
    />
  );
}
