"use client";

import React from "react";

import { useMarket } from "../../context/MarketContext";
import { TradingViewTechnicalAnalysis } from "../../widgets/TradingViewTechnicalAnalysis";

export function AiTab() {
  const { locale, instrument } = useMarket();

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "FxLocus 执行模板" : "FxLocus Execution Template"}
        </div>

        <div className="mt-3 text-sm leading-6 text-white/75">
          {locale === "zh" ? (
            <>
              <p>
                <b>先认知：</b>我在交易什么叙事？证据链是什么？
              </p>
              <p>
                <b>再位置：</b>关键位在哪里？（结构位/区间边界/证伪点）
              </p>
              <p>
                <b>后执行：</b>风险边界与退出条件明确后，才允许执行。
              </p>
              <p className="mt-3 text-xs text-white/45">
                这不是买卖建议，是“训练流程”。
              </p>
            </>
          ) : (
            <>
              <p>
                <b>Context:</b> What narrative am I trading?
              </p>
              <p>
                <b>Levels:</b> Key levels & invalidation points.
              </p>
              <p>
                <b>Execution:</b> Only execute with defined risk boundaries.
              </p>
              <p className="mt-3 text-xs text-white/45">
                Not buy/sell advice. Training workflow only.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
          <div className="font-semibold text-white/85">
            {locale === "zh" ? "执行清单" : "Checklist"}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{locale === "zh" ? "证伪点写清楚" : "Define invalidation clearly"}</li>
            <li>{locale === "zh" ? "单笔风险边界固定" : "Fixed per-trade risk boundary"}</li>
            <li>{locale === "zh" ? "不追单、不报复" : "No revenge trading"}</li>
            <li>{locale === "zh" ? "复盘看流程一致性" : "Review process consistency"}</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "技术分析摘要（事实数据）" : "Technical Analysis (Fact Data)"}
        </div>
        <div className="mt-2 text-xs text-white/50">
          {locale === "zh" ? "来源：TradingView" : "Sourced from TradingView"}
        </div>

        <div className="mt-3">
          <TradingViewTechnicalAnalysis tvSymbol={instrument.tvSymbol} locale={locale} />
        </div>
      </div>
    </div>
  );
}
