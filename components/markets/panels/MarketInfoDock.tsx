"use client";

import React from "react";

import { useMarket } from "../context/MarketContext";
import { AiTab } from "./tabs/AiTab";
import { NewsTab } from "./tabs/NewsTab";

export const marketDockTabs = [
  { key: "ai", zh: "FL视角", en: "FL View" },
  { key: "news", zh: "新闻", en: "News" }
] as const;

export type MarketDockTabKey = (typeof marketDockTabs)[number]["key"];

type Props = {
  activeTab?: MarketDockTabKey | null;
  onTabChange?: (tab: MarketDockTabKey) => void;
  onClose?: () => void;
  showTabs?: boolean;
};

export function MarketInfoDock({ activeTab, onTabChange, onClose, showTabs = true }: Props) {
  const { locale } = useMarket();
  const [innerTab, setInnerTab] = React.useState<MarketDockTabKey>("ai");
  const [mountedTabs, setMountedTabs] = React.useState<Record<MarketDockTabKey, boolean>>({
    ai: true,
    news: false
  });

  const tab = (activeTab ?? innerTab) as MarketDockTabKey;

  const setTab = (next: MarketDockTabKey) => {
    onTabChange?.(next);
    if (activeTab == null) setInnerTab(next);
  };

  const label = (item: (typeof marketDockTabs)[number]) => (locale === "zh" ? item.zh : item.en);

  React.useEffect(() => {
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, [tab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[44px] items-center gap-2 border-b border-white/10 bg-white/5 px-3 flex-nowrap overflow-x-auto">
        {showTabs
          ? marketDockTabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={[
                  "fx-tab shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm transition",
                  tab === item.key
                    ? "border-white/20 bg-white/10 text-white fx-tab-active"
                    : "border-white/10 bg-white/0 text-white/70 hover:bg-white/5 hover:text-white"
                ].join(" ")}
              >
                {label(item)}
              </button>
            ))
          : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap text-xs text-white/45">
            {locale === "zh" ? "训练用途|不构成投资建议" : "Training use only"}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="h-4 w-4 rounded-full border border-red-300/60 bg-gradient-to-br from-red-400 via-red-500 to-rose-600 shadow-[0_0_10px_rgba(248,113,113,0.8)] transition hover:scale-110"
              title={locale === "zh" ? "关闭面板" : "Close panel"}
              aria-label={locale === "zh" ? "关闭面板" : "Close panel"}
            />
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className={tab === "ai" ? "block" : "hidden"} aria-hidden={tab !== "ai"}>
          {mountedTabs.ai ? <AiTab /> : null}
        </div>
        <div className={tab === "news" ? "block" : "hidden"} aria-hidden={tab !== "news"}>
          {mountedTabs.news ? <NewsTab /> : null}
        </div>
      </div>
    </div>
  );
}
