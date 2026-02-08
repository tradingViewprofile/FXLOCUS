"use client";

import React from "react";

import { MarketProvider, type Instrument } from "./context/MarketContext";
import { InstrumentSidebar } from "./InstrumentSidebar";
import { MarketCenterPanel } from "./MarketCenterPanel";

const DEFAULT_INSTRUMENT: Instrument = {
  id: "default_eurusd",
  category: "fx_direct",
  symbolCode: "EUR/USD",
  nameZh: "欧元/美元",
  nameEn: "Euro / USD",
  tvSymbol: "FX:EURUSD"
};

const STORAGE_KEY = "fxlocus:markets:layout";

const RAIL_WIDTH = 52;
const HANDLE_WIDTH = 10;
const LEFT_MIN = 260;
const LEFT_MAX = 520;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function useHeaderHeight(defaultHeight = 64) {
  const [height, setHeight] = React.useState(defaultHeight);

  React.useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const update = () => setHeight(header.getBoundingClientRect().height || defaultHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [defaultHeight]);

  return height;
}

type Props = {
  locale: "zh" | "en";
};

export function MarketsTerminal({ locale }: Props) {
  const headerHeight = useHeaderHeight(64);

  const [leftWidth, setLeftWidth] = React.useState(LEFT_MIN);
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [chartReady, setChartReady] = React.useState(false);
  const [sidebarReady, setSidebarReady] = React.useState(false);
  const maskVisible = !(chartReady && sidebarReady);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.leftWidth === "number") setLeftWidth(data.leftWidth);
      if (typeof data.leftCollapsed === "boolean") setLeftCollapsed(data.leftCollapsed);
    } catch {
      // ignore storage errors
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ leftWidth, leftCollapsed })
      );
    } catch {
      // ignore storage errors
    }
  }, [leftWidth, leftCollapsed]);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const dragRef = React.useRef({
    active: false,
    startX: 0,
    startWidth: 0
  });

  const onPointerDown = (event: React.PointerEvent) => {
    if (leftCollapsed) return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startWidth: leftWidth
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const delta = event.clientX - dragRef.current.startX;
    setLeftWidth(clamp(dragRef.current.startWidth + delta, LEFT_MIN, LEFT_MAX));
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const onChartStatusChange = React.useCallback((status: "loading" | "ready" | "error") => {
    setChartReady(status !== "loading");
  }, []);

  const onSidebarReady = React.useCallback(() => {
    setSidebarReady(true);
  }, []);

  React.useEffect(() => {
    if (leftCollapsed) {
      setSidebarReady(true);
    }
  }, [leftCollapsed]);

  const actualLeftWidth = leftCollapsed ? RAIL_WIDTH : leftWidth;
  const railLabel = locale === "zh" ? "品种" : "Instruments";
  const railHint = locale === "zh" ? "展开品种栏" : "Expand instruments";
  const collapseLabel = locale === "zh" ? "收起品种" : "Collapse";
  const collapseHint = locale === "zh" ? "收起品种栏" : "Collapse instruments";
  const resizeLabel =
    locale === "zh" ? "拖拽调整品种栏宽度" : "Resize instruments panel";

  return (
    <MarketProvider locale={locale} initialInstrument={DEFAULT_INSTRUMENT}>
      <div
        className="relative w-screen overflow-hidden"
        style={{ height: `calc(100vh - ${headerHeight}px)` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: `${actualLeftWidth}px ${
              leftCollapsed ? 0 : HANDLE_WIDTH
            }px minmax(0, 1fr)`
          }}
        >
          <aside className="h-full min-h-0 overflow-hidden border-r border-white/10 bg-white/5">
            {leftCollapsed ? (
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-200/80 hover:bg-white/5 hover:text-slate-50"
                onClick={() => setLeftCollapsed(false)}
                title={railHint}
                aria-label={railHint}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <span className="flex flex-col gap-1">
                    <span className="h-[2px] w-4 rounded bg-white/70" />
                    <span className="h-[2px] w-4 rounded bg-white/70" />
                    <span className="h-[2px] w-4 rounded bg-white/70" />
                  </span>
                </span>
                <span className="text-xs tracking-[0.3em] [writing-mode:vertical-rl] rotate-180">
                  {railLabel}
                </span>
              </button>
            ) : (
              <div className="h-full min-h-0">
                <InstrumentSidebar
                  onCollapse={() => setLeftCollapsed(true)}
                  collapseLabel={collapseLabel}
                  collapseHint={collapseHint}
                  onReady={onSidebarReady}
                />
              </div>
            )}
          </aside>

          {!leftCollapsed ? (
            <div
              className="h-full cursor-col-resize touch-none hover:bg-white/10"
              onPointerDown={onPointerDown}
              role="separator"
              aria-label={resizeLabel}
              title={resizeLabel}
            />
          ) : (
            <div />
          )}

          <main className="h-full min-h-0 overflow-hidden bg-white/5">
            <MarketCenterPanel onChartStatusChange={onChartStatusChange} />
          </main>
        </div>

        {maskVisible ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-white/80 shadow-xl">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
              <div className="text-sm">
                {locale === "zh" ? "加载行情数据中..." : "Loading market data..."}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MarketProvider>
  );
}
