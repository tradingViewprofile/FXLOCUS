"use client";

import React from "react";

type Locale = "zh" | "en";
type CourseLevel = "basic" | "intermediate";

type Lesson = {
  zh: string;
  en: string;
};

type Course = {
  id: string;
  level: CourseLevel;
  title: { zh: string; en: string };
  subtitle: { zh: string; en: string };
  summary: { zh: string; en: string };
  posterTone: "ember" | "aurora" | "midnight" | "glacier";
  lessons: Lesson[];
};

const COURSES: Course[] = [
  {
    id: "fx-foundation",
    level: "basic",
    title: { zh: "外汇入门·市场结构", en: "FX Foundations: Market Structure" },
    subtitle: { zh: "建立宏观认知与交易语言", en: "Build market context and trading language" },
    summary: {
      zh: "从参与者、流动性、报价与点差结构入手，建立外汇市场的全局理解。",
      en: "Learn market participants, liquidity, quotes, and spreads to build a solid FX framework."
    },
    posterTone: "ember",
    lessons: [
      { zh: "外汇市场结构与主要参与者", en: "Market structure & participants" },
      { zh: "报价机制与点差形成", en: "Quoting mechanics & spread formation" },
      { zh: "交易时段与流动性分布", en: "Sessions & liquidity distribution" },
      { zh: "主要货币对与品种认知", en: "Major pairs & instruments" },
      { zh: "交易成本与滑点控制", en: "Costs & slippage control" },
      { zh: "基础术语与交易语言", en: "Core terminology & trading language" }
    ]
  },
  {
    id: "fx-setup",
    level: "basic",
    title: { zh: "外汇入门·交易执行", en: "FX Foundations: Execution" },
    subtitle: { zh: "掌握K线与基础策略", en: "Candles, orders, and base setups" },
    summary: {
      zh: "从订单类型、K线结构、趋势与盘整逻辑建立第一套可执行方案。",
      en: "Master order types, candle structure, and trend/range logic for your first playbook."
    },
    posterTone: "glacier",
    lessons: [
      { zh: "订单类型与执行流程", en: "Order types & execution flow" },
      { zh: "K线结构与关键形态", en: "Candle structure & patterns" },
      { zh: "趋势与盘整的识别", en: "Trend vs range identification" },
      { zh: "支撑阻力与区间策略", en: "Support/resistance setups" },
      { zh: "入场、止损、止盈", en: "Entry, stop, and take-profit" },
      { zh: "新手常见错误清单", en: "Beginner error checklist" }
    ]
  },
  {
    id: "fx-structure",
    level: "intermediate",
    title: { zh: "中级·结构化交易系统", en: "Intermediate: Structured System" },
    subtitle: { zh: "建立系统化交易流程", en: "Build a repeatable workflow" },
    summary: {
      zh: "围绕结构、情绪、驱动信息构建标准化进出场与复盘体系。",
      en: "Build a standardized workflow around structure, sentiment, and catalysts."
    },
    posterTone: "aurora",
    lessons: [
      { zh: "结构级别与多周期一致性", en: "Structure levels & multi-timeframe" },
      { zh: "驱动因子与事件过滤", en: "Catalysts & event filters" },
      { zh: "交易计划模板与执行", en: "Playbook templates & execution" },
      { zh: "仓位规划与风险分层", en: "Position sizing & risk tiers" },
      { zh: "复盘框架与交易日志", en: "Review framework & journaling" },
      { zh: "策略评估与迭代", en: "Strategy evaluation & iteration" }
    ]
  },
  {
    id: "fx-risk",
    level: "intermediate",
    title: { zh: "中级·资金与风险管理", en: "Intermediate: Risk & Capital" },
    subtitle: { zh: "曲线稳定与回撤控制", en: "Stability and drawdown control" },
    summary: {
      zh: "以资金曲线为核心，构建回撤控制、动态风险与绩效跟踪。",
      en: "Build capital protection, dynamic risk rules, and performance tracking."
    },
    posterTone: "midnight",
    lessons: [
      { zh: "资金曲线与风险容忍度", en: "Equity curve & risk tolerance" },
      { zh: "回撤控制与规则化停止", en: "Drawdown control & stop rules" },
      { zh: "动态风险与波动调整", en: "Dynamic risk & volatility sizing" },
      { zh: "统计指标与绩效复盘", en: "Metrics & performance review" },
      { zh: "心理偏差与执行修正", en: "Behavior bias & execution fixes" },
      { zh: "长期策略组合管理", en: "Long-term portfolio management" }
    ]
  }
];

const ADVANCED_OUTLINE = {
  zh: [
    "量化模型与策略回测框架",
    "宏观对冲与跨资产配置",
    "事件驱动与结构化套利",
    "风险情景模拟与压力测试",
    "高频数据处理与执行优化",
    "策略组合与资金曲线优化"
  ],
  en: [
    "Quant models & backtesting framework",
    "Macro hedging & cross-asset allocation",
    "Event-driven & structured arbitrage",
    "Risk scenario & stress testing",
    "High-frequency data & execution tuning",
    "Strategy portfolio & equity optimization"
  ]
};

const POSTER_STYLES: Record<Course["posterTone"], string> = {
  ember:
    "bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.35),transparent_60%)]",
  aurora:
    "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.35),transparent_60%)]",
  midnight:
    "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.28),transparent_60%)]",
  glacier:
    "bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.3),transparent_60%)]"
};

function CoursePoster({
  tone,
  title,
  subtitle
}: {
  tone: Course["posterTone"];
  title: string;
  subtitle: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 p-4 ${POSTER_STYLES[tone]}`}>
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <div className="text-[11px] font-semibold tracking-[0.3em] text-white/70">FXLOCUS</div>
        <div className="mt-4 text-base font-semibold text-white">{title}</div>
        <div className="mt-2 text-xs text-white/60">{subtitle}</div>
      </div>
    </div>
  );
}

export function PublicCoursesClient({ locale }: { locale: Locale }) {
  const [selected, setSelected] = React.useState<Course>(() => COURSES[0]);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const label = (value: { zh: string; en: string }) => (locale === "zh" ? value.zh : value.en);
  const basicCourses = COURSES.filter((course) => course.level === "basic");
  const intermediateCourses = COURSES.filter((course) => course.level === "intermediate");

  return (
    <div className="space-y-12 md:space-y-14">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 p-8 md:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_60%)]" />
        <div className="relative space-y-4">
          <div className="text-xs font-semibold tracking-[0.32em] text-slate-200/70">
            {locale === "zh" ? "FXLOCUS 课程体系" : "FXLOCUS COURSE TRACKS"}
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 md:text-4xl">
            {locale === "zh" ? "外汇训练路线图" : "Forex Training Roadmap"}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-200/70">
            {locale === "zh"
              ? "聚焦基础认知、执行系统与风险控制，形成可复制的交易能力。"
              : "Focus on foundations, execution systems, and risk control to build repeatable performance."}
          </p>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-10">
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">
                {locale === "zh" ? "基础外汇入门课程" : "Foundation FX Courses"}
              </h2>
              <p className="mt-2 text-sm text-slate-200/60">
                {locale === "zh" ? "从认知到执行，建立交易第一性原理。" : "From cognition to execution."}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {basicCourses.map((course) => {
                const active = selected.id === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelected(course)}
                    className={[
                      "text-left rounded-3xl border p-5 transition",
                      active
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    ].join(" ")}
                  >
                    <CoursePoster tone={course.posterTone} title={label(course.title)} subtitle={label(course.subtitle)} />
                    <div className="mt-4 text-lg font-semibold text-white">{label(course.title)}</div>
                    <p className="mt-2 text-sm text-white/70">{label(course.summary)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">
                {locale === "zh" ? "中级课程" : "Intermediate Courses"}
              </h2>
              <p className="mt-2 text-sm text-slate-200/60">
                {locale === "zh" ? "系统化交易与风险控制。" : "Systemized trading and risk control."}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {intermediateCourses.map((course) => {
                const active = selected.id === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelected(course)}
                    className={[
                      "text-left rounded-3xl border p-5 transition",
                      active
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    ].join(" ")}
                  >
                    <CoursePoster tone={course.posterTone} title={label(course.title)} subtitle={label(course.subtitle)} />
                    <div className="mt-4 text-lg font-semibold text-white">{label(course.title)}</div>
                    <p className="mt-2 text-sm text-white/70">{label(course.summary)}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">
                {locale === "zh" ? "高级课程清单" : "Advanced Course Outline"}
              </h2>
              <p className="mt-2 text-sm text-slate-200/60">
                {locale === "zh" ? "面向专业化进阶方向的内容纲要。" : "Outline for advanced professional topics."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="grid gap-3 md:grid-cols-2">
                {(locale === "zh" ? ADVANCED_OUTLINE.zh : ADVANCED_OUTLINE.en).map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/75">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col gap-5 xl:sticky xl:top-24 h-fit">
          <CoursePoster
            tone={selected.posterTone}
            title={label(selected.title)}
            subtitle={label(selected.subtitle)}
          />
          <div>
            <div className="text-xs font-semibold tracking-[0.3em] text-slate-200/70">
              {locale === "zh" ? "课程目录" : "LESSON LIST"}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-50">{label(selected.title)}</h3>
            <p className="mt-2 text-sm text-slate-200/70">{label(selected.summary)}</p>
          </div>

          <div className="space-y-2">
            {selected.lessons.map((lesson, idx) => (
              <div
                key={lesson.zh}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
              >
                <span>{locale === "zh" ? `第${idx + 1}课` : `Lesson ${idx + 1}`}</span>
                <span className="text-white/60">{label(lesson)}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex justify-end">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="rounded-full border border-sky-400/40 bg-sky-500/20 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-500/30"
            >
              {locale === "zh" ? "立即观看" : "Watch now"}
            </button>
          </div>
        </aside>
      </div>

      <div
        className={[
          "fixed inset-0 z-50",
          panelOpen ? "pointer-events-auto" : "pointer-events-none"
        ].join(" ")}
        aria-hidden={!panelOpen}
      >
        <div
          className={[
            "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300",
            panelOpen ? "opacity-100" : "opacity-0"
          ].join(" ")}
          onClick={() => setPanelOpen(false)}
        />
        <div
          className={[
            "absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-slate-950/95 shadow-[-12px_0_60px_rgba(15,23,42,0.6)]",
            "transition-transform duration-300",
            panelOpen ? "translate-x-0" : "translate-x-full"
          ].join(" ")}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full flex-col p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold tracking-[0.3em] text-slate-200/70">
                {locale === "zh" ? "\u8bfe\u7a0b\u63d0\u793a" : "COURSE NOTICE"}
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-slate-200/80 hover:bg-white/10"
                aria-label={locale === "zh" ? "\u5173\u95ed" : "Close"}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.6)]" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-lg font-semibold text-slate-50">
                {locale === "zh" ? "\u8bfe\u7a0b\u6682\u672a\u5f00\u653e" : "Courses are not open yet"}
              </div>
              <p className="text-sm leading-6 text-slate-200/70">
                {locale === "zh"
                  ? "\u8bfe\u7a0b\u6682\u4e0d\u5bf9\u5916\u5f00\u653e\uff0c\u8bf7\u8054\u7cfb\u56e2\u961f\u957f\uff0c\u62a5\u540d\u53c2\u52a0\u57f9\u8bad\u3002"
                  : "Courses are not open yet. Please contact your team lead to enroll."}
              </p>
            </div>

            <div className="mt-auto flex justify-end pt-8">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-full border border-sky-400/40 bg-sky-500/20 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-500/30"
              >
                {locale === "zh" ? "\u77e5\u9053\u4e86" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
