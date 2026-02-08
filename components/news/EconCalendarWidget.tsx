"use client";

import React from "react";

import { TradingViewWidget } from "@/components/markets/widgets/TradingViewWidget";

export function EconCalendarWidget({
  locale,
  onStatusChange
}: {
  locale: "zh" | "en";
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
}) {
  return (
    <TradingViewWidget
      scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
      depsKey={`events:${locale}`}
      className="h-full w-full overflow-hidden"
      height="100%"
      onStatusChange={onStatusChange}
      options={{
        colorTheme: "dark",
        isTransparent: true,
        width: "100%",
        height: "100%",
        locale: locale === "zh" ? "zh_CN" : "en",
        importanceFilter: "-1,0,1",
        currencyFilter: "USD,EUR,GBP,JPY,CNY,AUD,CAD,CHF,NZD"
      }}
    />
  );
}
