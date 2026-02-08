"use client";

import React from "react";
import dynamic from "next/dynamic";

import { useMarket } from "./context/MarketContext";
import { useFullscreen } from "./hooks/useFullscreen";
import { FloatingDock } from "./FloatingDock";
import type { MarketDockTabKey } from "./panels/MarketInfoDock";

const TradingViewAdvancedChart = dynamic(
  () => import("./widgets/TradingViewAdvancedChart").then((mod) => mod.TradingViewAdvancedChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        Loading chart...
      </div>
    )
  }
);

const MarketInfoDock = dynamic(
  () => import("./panels/MarketInfoDock").then((mod) => mod.MarketInfoDock),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
        Loading panel...
      </div>
    )
  }
);

export function MarketCenterPanel({
  onChartStatusChange
}: {
  onChartStatusChange?: (status: "loading" | "ready" | "error") => void;
}) {
  const { locale, instrument } = useMarket();
  const fsRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { isFullscreen, toggle } = useFullscreen(fsRef);

  const [rebuildKey, setRebuildKey] = React.useState("init");
  const [activePanel, setActivePanel] = React.useState<MarketDockTabKey | null>(null);

  React.useEffect(() => {
    setRebuildKey(String(Date.now()));
  }, [isFullscreen]);

  return (
    <div ref={fsRef} className="relative h-full min-h-0 bg-[#050a14]">
      <div ref={containerRef} className="relative flex h-full min-h-0">
        <div className="relative min-h-0 flex-1">
          <div className="h-full w-full">
            <TradingViewAdvancedChart
              tvSymbol={instrument.tvSymbol}
              locale={locale}
              rebuildKey={rebuildKey}
              onStatusChange={onChartStatusChange}
            />
          </div>
        </div>

        {activePanel ? (
          <aside className="w-[400px] min-w-[320px] max-w-[460px] border-l border-white/10 bg-[#050a14]">
            <MarketInfoDock
              activeTab={activePanel}
              onTabChange={(tab) => setActivePanel(tab)}
              onClose={() => setActivePanel(null)}
              showTabs={false}
            />
          </aside>
        ) : null}

        <FloatingDock
          locale={locale}
          containerRef={containerRef}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggle}
        />
      </div>
    </div>
  );
}
