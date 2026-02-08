import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Hero } from "@/components/home/Hero";
import { EquityCurveTestimonials } from "@/components/home/EquityCurveTestimonials";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { PillarsCognitiveMap } from "@/components/home/PillarsCognitiveMap";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { homeMarketsCoverage, pickLocale } from "@/lib/mock/home";

type Props = {
  params: { locale: Locale };
};

function pick(locale: Locale, value: { zh: string; en: string }) {
  return locale === "en" ? value.en : value.zh;
}

type LocalizedText = { zh: string; en: string };

const comparisonColumns = [
  { key: "fxlocus", label: { zh: "FxLocus", en: "FxLocus" }, highlight: true },
  { key: "prop", label: { zh: "自营机构", en: "Prop Firm" }, highlight: false },
  { key: "traditional", label: { zh: "传统机构", en: "Traditional Firm" }, highlight: false },
  { key: "online", label: { zh: "线上课程", en: "Online Course" }, highlight: false },
  { key: "self", label: { zh: "个人自学", en: "Self Study" }, highlight: false }
] as const;

type ComparisonKey = (typeof comparisonColumns)[number]["key"];

const comparisonRows: Array<{
  key: string;
  label: LocalizedText;
  values: Record<ComparisonKey, LocalizedText>;
}> = [
  {
    key: "fee",
    label: { zh: "培训费用", en: "Training cost" },
    values: {
      fxlocus: { zh: "完全免费", en: "Completely free" },
      prop: { zh: "考核费", en: "Challenge fee" },
      traditional: { zh: "高额学费", en: "High tuition" },
      online: { zh: "购买费", en: "Course purchase" },
      self: { zh: "时间成本", en: "Time cost" }
    }
  },
  {
    key: "mode",
    label: { zh: "培养模式", en: "Training mode" },
    values: {
      fxlocus: { zh: "小团队陪伴", en: "Small-team coaching" },
      prop: { zh: "无培训", en: "No coaching" },
      traditional: { zh: "大班课", en: "Large classes" },
      online: { zh: "无指导", en: "Self-guided" },
      self: { zh: "师徒制", en: "Apprenticeship" }
    }
  },
  {
    key: "support",
    label: { zh: "社区支持", en: "Community" },
    values: {
      fxlocus: { zh: "24/7", en: "24/7" },
      prop: { zh: "论坛", en: "Forum" },
      traditional: { zh: "有限时段", en: "Limited hours" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "小群组", en: "Small group" }
    }
  },
  {
    key: "profit",
    label: { zh: "利润分成", en: "Profit split" },
    values: {
      fxlocus: { zh: "60-90%", en: "60-90%" },
      prop: { zh: "60-90%", en: "60-90%" },
      traditional: { zh: "N/A", en: "N/A" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "按协议", en: "By agreement" }
    }
  },
  {
    key: "capital",
    label: { zh: "资金规模", en: "Capital size" },
    values: {
      fxlocus: { zh: "$100K-$2M", en: "$100K-$2M" },
      prop: { zh: "$10K-$200K", en: "$10K-$200K" },
      traditional: { zh: "N/A", en: "N/A" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "看情况", en: "Depends" }
    }
  },
  {
    key: "cycle",
    label: { zh: "培养周期", en: "Cycle length" },
    values: {
      fxlocus: { zh: "培养30-90天", en: "Training 30-90 days" },
      prop: { zh: "1-3月", en: "1-3 months" },
      traditional: { zh: "6-12月", en: "6-12 months" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "不确定", en: "Uncertain" }
    }
  },
  {
    key: "standard",
    label: { zh: "考核标准", en: "Evaluation" },
    values: {
      fxlocus: { zh: "稳定盈利", en: "Consistent profit" },
      prop: { zh: "严格规则", en: "Strict rules" },
      traditional: { zh: "模糊", en: "Vague" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "自定义", en: "Self-defined" }
    }
  },
  {
    key: "experience",
    label: { zh: "实盘经验", en: "Live experience" },
    values: {
      fxlocus: { zh: "100%实盘", en: "100% live" },
      prop: { zh: "视情况", en: "Depends" },
      traditional: { zh: "理论多", en: "Mostly theory" },
      online: { zh: "N/A", en: "N/A" },
      self: { zh: "看水平", en: "Skill-dependent" }
    }
  },
  {
    key: "potential",
    label: { zh: "收益潜力", en: "Income potential" },
    values: {
      fxlocus: { zh: "无上限", en: "No ceiling" },
      prop: { zh: "有上限", en: "Capped" },
      traditional: { zh: "有限", en: "Limited" },
      online: { zh: "靠运气", en: "Luck-based" },
      self: { zh: "不稳定", en: "Unstable" }
    }
  }
];

const careerSteps: Array<{
  key: string;
  phase: LocalizedText;
  title: LocalizedText;
  duration: LocalizedText;
  summary: LocalizedText;
  highlight?: boolean;
  badge?: LocalizedText;
}> = [
  {
    key: "01",
    phase: { zh: "第1阶段", en: "Stage 1" },
    title: { zh: "规则学习", en: "Rule Foundations" },
    duration: { zh: "3天", en: "3 days" },
    summary: {
      zh: "姿势标准化，掌握核心规则与执行边界。",
      en: "Standardize execution and core rules."
    }
  },
  {
    key: "02",
    phase: { zh: "第2阶段", en: "Stage 2" },
    title: { zh: "盈利练习", en: "Profitability Practice" },
    duration: { zh: "15天", en: "15 days" },
    summary: {
      zh: "心态稳定化，建立稳定的节奏与纪律。",
      en: "Build rhythm, discipline, and stability."
    }
  },
  {
    key: "03",
    phase: { zh: "第3阶段", en: "Stage 3" },
    title: { zh: "盈利考核", en: "Profit Evaluation" },
    duration: { zh: "10天", en: "10 days" },
    summary: {
      zh: "不侥幸、不重仓，严格规则通过考核。",
      en: "Pass the evaluation with strict rules."
    }
  },
  {
    key: "04",
    phase: { zh: "第4阶段", en: "Stage 4" },
    title: { zh: "小额实盘", en: "Small-Capital Live" },
    duration: { zh: "20天", en: "20 days" },
    summary: {
      zh: "日回撤 < 5%，稳定执行系统化操作。",
      en: "Keep drawdown <5% with system rules."
    }
  },
  {
    key: "05",
    phase: { zh: "第5阶段", en: "Stage 5" },
    title: { zh: "大额矩阵", en: "Capital Matrix" },
    duration: { zh: "生涯开启", en: "Career launch" },
    summary: {
      zh: "多层资金叠加，分成 60%-90%。",
      en: "Multi-tier capital with 60-90% split."
    },
    highlight: true,
    badge: { zh: "生涯开启", en: "Launch" }
  },
  {
    key: "06",
    phase: { zh: "第6阶段", en: "Stage 6" },
    title: { zh: "5分钟级别", en: "5-Minute Level" },
    duration: { zh: "3个月", en: "3 months" },
    summary: {
      zh: "单向交易，快速级别升级。",
      en: "Directional trading and fast upgrading."
    }
  },
  {
    key: "07",
    phase: { zh: "第7阶段", en: "Stage 7" },
    title: { zh: "15分钟级别", en: "15-Minute Level" },
    duration: { zh: "6个月", en: "6 months" },
    summary: {
      zh: "多空双向，执行稳定度提升。",
      en: "Bi-directional trades with stability."
    }
  },
  {
    key: "08",
    phase: { zh: "第8阶段", en: "Stage 8" },
    title: { zh: "1小时级别", en: "1-Hour Level" },
    duration: { zh: "1年", en: "1 year" },
    summary: {
      zh: "多空双向交易，技术走向成熟。",
      en: "Mature techniques with balanced trades."
    }
  },
  {
    key: "09",
    phase: { zh: "第9阶段", en: "Stage 9" },
    title: { zh: "4H / 日级别", en: "4H / Daily Level" },
    duration: { zh: "2年", en: "2 years" },
    summary: {
      zh: "顶级交易员，财富自由。",
      en: "Top-tier trader with long-term freedom."
    }
  }
];

const partnerLogos = [
  {
    id: "metacopier",
    name: "MetaCopier",
    logo: "/official-partner-logos-svg-pro/MetaCopier/logo.svg",
    category: { zh: "复制跟随", en: "Copy trading" },
    accent: "sky" as const
  },
  {
    id: "ftmo",
    name: "FTMO",
    logo: "/official-partner-logos-svg-pro/FTMO/logo.svg",
    category: { zh: "资金挑战", en: "Funding challenge" },
    accent: "amber" as const
  },
  {
    id: "fundednext",
    name: "FundedNext",
    logo: "/official-partner-logos-svg-pro/FundedNext/logo.svg",
    category: { zh: "资金挑战", en: "Funding challenge" },
    accent: "amber" as const
  },
  {
    id: "tickmill",
    name: "Tickmill",
    logo: "/official-partner-logos-svg-pro/Tickmill/logo.svg",
    category: { zh: "流动性支持", en: "Liquidity access" },
    accent: "emerald" as const
  },
  {
    id: "ecmarkets",
    name: "EC Markets",
    logo: "/official-partner-logos-svg-pro/EC-Markets/logo.svg",
    category: { zh: "经纪服务", en: "Brokerage" },
    accent: "emerald" as const
  },
  {
    id: "axi",
    name: "Axi",
    logo: "/official-partner-logos-svg-pro/Axi/logo.svg",
    category: { zh: "经纪服务", en: "Brokerage" },
    accent: "sky" as const
  },
  {
    id: "eightcap",
    name: "Eightcap",
    logo: "/official-partner-logos-svg-pro/Eightcap/logo.svg",
    category: { zh: "经纪服务", en: "Brokerage" },
    accent: "amber" as const
  },
  {
    id: "pepperstone",
    name: "Pepperstone",
    logo: "/official-partner-logos-svg-pro/Pepperstone/logo.svg",
    category: { zh: "经纪服务", en: "Brokerage" },
    accent: "amber" as const
  },
  {
    id: "cmc",
    name: "CMC Markets",
    logo: "/official-partner-logos-svg-pro/CMC-Markets/logo.svg",
    category: { zh: "市场数据", en: "Market data" },
    accent: "violet" as const
  },
  {
    id: "oanda",
    name: "OANDA",
    logo: "/official-partner-logos-svg-pro/OANDA/logo.svg",
    category: { zh: "市场数据", en: "Market data" },
    accent: "sky" as const
  },
  {
    id: "tradingeconomics",
    name: "TradingEconomics",
    logo: "/official-partner-logos-svg-pro/TradingEconomics/logo.svg",
    category: { zh: "宏观数据", en: "Macro data" },
    accent: "violet" as const
  },
  {
    id: "investing",
    name: "Investing.com",
    logo: "/official-partner-logos-svg-pro/Investingcom/logo.svg",
    category: { zh: "宏观数据", en: "Macro data" },
    accent: "emerald" as const
  }
];

const advantageHighlights = [
  {
    title: { zh: "实盘资金递进", en: "Capital progression" },
    desc: { zh: "通过考核后开放更高资金层级。", en: "Unlock higher tiers after evaluation." }
  },
  {
    title: { zh: "风控边界明确", en: "Clear risk boundaries" },
    desc: { zh: "日内回撤与最大亏损有量化标准。", en: "Daily drawdown and loss limits are quantified." }
  },
  {
    title: { zh: "执行节奏陪跑", en: "Execution cadence" },
    desc: { zh: "一对一复盘，纠偏动作可追踪。", en: "1:1 reviews with trackable corrections." }
  },
  {
    title: { zh: "实战数据看板", en: "Live performance dashboards" },
    desc: { zh: "利润、胜率、回撤一目了然。", en: "PnL, win rate, and drawdown in one view." }
  },
  {
    title: { zh: "多周期适配", en: "Multi-timeframe fit" },
    desc: { zh: "日内与波段路径清晰可切换。", en: "Clear paths for intraday and swing." }
  },
  {
    title: { zh: "收益分成透明", en: "Transparent split" },
    desc: { zh: "毕业后资金分成规则公开。", en: "Post-graduation split rules are transparent." }
  }
];

const careerHighlights = [
  {
    title: { zh: "阶段目标明确", en: "Clear stage goals" },
    desc: { zh: "每阶段都有动作与验收标准。", en: "Each stage has actions and checkpoints." }
  },
  {
    title: { zh: "风控贯穿全程", en: "Risk discipline throughout" },
    desc: { zh: "以回撤与执行一致性为核心。", en: "Drawdown and execution consistency first." }
  },
  {
    title: { zh: "可升级资金路径", en: "Capital progression" },
    desc: { zh: "通过评估即可获得更高资金层级。", en: "Pass reviews to unlock higher tiers." }
  }
];

const careerMetrics = [
  { label: { zh: "训练周期", en: "Training cycle" }, value: { zh: "培养30-90天", en: "Training 30-90 days" } },
  { label: { zh: "核心考核", en: "Core evaluation" }, value: { zh: "纪律 + 复盘", en: "Discipline + review" } },
  { label: { zh: "资金跃迁", en: "Capital jump" }, value: { zh: "$50K+", en: "$50K+" } }
];

const ctaHighlights = [
  {
    title: { zh: "完全免费培训", en: "Free training" },
    desc: { zh: "规则化陪伴训练", en: "Structured coaching" }
  },
  {
    title: { zh: "30-90天系统培养", en: "30-90 day training" },
    desc: { zh: "稳定节奏与纪律", en: "Stable rhythm & discipline" }
  },
  {
    title: { zh: "通过即获资金", en: "Capital on pass" },
    desc: { zh: "实盘进阶通道", en: "Live capital pathway" }
  },
  {
    title: { zh: "60-90%分成", en: "60-90% split" },
    desc: { zh: "收益与成长同步", en: "Growth-aligned split" }
  }
];

const ctaSteps = [
  {
    key: "01",
    title: { zh: "结构拆解", en: "Structure mapping" },
    desc: { zh: "先写叙事与关键位", en: "Narrative + key levels first" }
  },
  {
    key: "02",
    title: { zh: "执行记录", en: "Execution log" },
    desc: { zh: "每笔决策可追溯", en: "Every decision is traceable" }
  },
  {
    key: "03",
    title: { zh: "周度复盘", en: "Weekly review" },
    desc: { zh: "持续修正系统", en: "Iterate the system weekly" }
  }
];

const ctaStats = [
  { value: "2,500+", label: { zh: "已服务学员", en: "Traders supported" } },
  { value: "12%", label: { zh: "通过率", en: "Pass rate" } },
  { value: "30-90", label: { zh: "平均训练周期(天)", en: "Avg cycle (days)" } },
  { value: "$50K+", label: { zh: "可进阶资金", en: "Capital access" } }
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("homeTitle"),
    description: t("homeDesc")
  };
}

export default async function HomePage({ params }: Props) {
  const locale = params.locale;

  const tHome = await getTranslations({ locale, namespace: "home" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tRisk = await getTranslations({ locale, namespace: "risk" });

  const partnerItems = partnerLogos.map((item) => ({
    id: item.id,
    name: item.name,
    logo: item.logo,
    category: pick(locale, item.category),
    accent: item.accent
  }));

  return (
    <div className="space-y-16 md:space-y-24">
      <Hero />

      <Section
        id="home-content"
        className="scroll-mt-24"
        eyebrow={tHome("about.eyebrow")}
        title={tHome("about.title")}
        lead={tHome("about.lead")}
      >
        <div className="mt-10 space-y-10">
          <div className="grid gap-6">
            <div className="space-y-4">
              <div data-video-slot="primary" className="space-y-3">
                <VideoPlayer src="/test/test.mp4" />
                <p className="text-xs leading-5 text-slate-200/60">
                  {tHome("about.videoDisclaimer")}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/framework" locale={locale} variant="primary">
                  {tHome("about.buttons.framework")}
                </ButtonLink>
                <ButtonLink href="/contact" locale={locale} variant="secondary">
                  {tHome("about.buttons.contact")}
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-7">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {tHome("about.blocks.philosophyTitle")}
              </div>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-200/75 md:text-base">
                <p>{tHome("about.body.p1")}</p>
                <p>{tHome("about.body.p2")}</p>
              </div>
            </Card>

            <Card className="p-7">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {tHome("about.blocks.methodTitle")}
              </div>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-200/75 md:text-base">
                <p>{tHome("about.body.p3")}</p>

                <div className="mt-6">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {tHome("about.blocks.loopTitle")}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                    {(tHome.raw("about.blocks.loopItems") as string[]).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        id="home-compare"
        className="scroll-mt-24"
        eyebrow={pick(locale, { zh: "全方位对比", en: "Full Comparison" })}
        title={pick(locale, { zh: "FxLocus VS 市场上的其他选择", en: "FxLocus vs market alternatives" })}
        lead={pick(locale, {
          zh: "用统一维度对照培训成本、成长效率与资金上限，快速看清差异。",
          en: "Compare cost, growth efficiency, and capital ceiling across options."
        })}
      >
        <div className="mt-10 rounded-[2.5rem] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_1.45fr]">
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-2">
                  <span className="fx-pill border-sky-400/30 text-sky-200/90">FxLocus</span>
                  <span className="text-xs text-slate-200/60">
                    {pick(locale, { zh: "品牌优势", en: "Brand edge" })}
                  </span>
                </div>
                <div className="mt-5">
                  <h3 className="text-2xl font-semibold text-slate-50">
                    {pick(locale, { zh: "训练优先，执行可复盘", en: "Training-first, reviewable execution" })}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-200/70">
                    {pick(locale, {
                      zh: "把训练周期、风控规则与资金路径写成可验证的流程，而不是只讲故事。",
                      en: "We turn training, risk rules, and capital access into a verifiable process."
                    })}
                  </p>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-200/75">
                  {comparisonRows.slice(0, 6).map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span className="text-xs text-slate-200/60">{pick(locale, row.label)}</span>
                      <span className="text-sm font-semibold text-sky-100">
                        {pick(locale, row.values.fxlocus)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {pick(locale, { zh: "优势模块", en: "Advantage modules" })}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {advantageHighlights.map((item) => (
                      <div key={item.title.en} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-50">
                          {pick(locale, item.title)}
                        </div>
                        <div className="mt-1 text-xs text-slate-200/65">
                          {pick(locale, item.desc)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                  {pick(locale, { zh: "快速结论", en: "Quick takeaway" })}
                </div>
                <div className="mt-4 grid gap-3">
                  {comparisonRows.slice(6).map((row) => (
                    <div
                      key={`fxlocus-${row.key}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span className="text-xs text-slate-200/60">{pick(locale, row.label)}</span>
                      <span className="text-sm font-semibold text-slate-100/85">
                        {pick(locale, row.values.fxlocus)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-xs text-slate-100/80">
                  {pick(locale, {
                    zh: "如果你想把“学习”变成“可验证的训练”，重点看：训练周期、风控边界、复盘标准、资金路径。",
                    en: "If you want measurable training, focus on cycle, risk limits, review standards, and capital path."
                  })}
                </div>
              </Card>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {comparisonRows.map((row) => (
                <Card key={row.key} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-50">{pick(locale, row.label)}</div>
                    <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100/90">
                      {pick(locale, row.values.fxlocus)}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate-200/70 md:grid-cols-2">
                    {comparisonColumns
                      .filter((column) => column.key !== "fxlocus")
                      .map((column) => (
                        <div
                          key={column.key}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-200/50">
                            {pick(locale, column.label)}
                          </div>
                          <div className="mt-1 text-sm text-slate-100/80">
                            {pick(locale, row.values[column.key])}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-200/50">
          {pick(locale, {
            zh: "数据为培训路径对比示意，具体以实际合作与审核规则为准。",
            en: "Comparison is illustrative; actual terms depend on program rules."
          })}
        </p>
      </Section>

      <Section
        id="home-career"
        className="scroll-mt-24"
        eyebrow={pick(locale, { zh: "职业晋升之路", en: "Career Advancement" })}
        title={pick(locale, { zh: "从新手到职业交易员的完整进阶路线", en: "A complete pathway from beginner to professional" })}
        lead={pick(locale, {
          zh: "每一阶段都有明确目标、周期与验证标准，确保成长可持续。",
          en: "Each stage has clear goals, cycles, and verification standards."
        })}
      >
        <div className="mt-10 rounded-[2.5rem] border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="grid gap-4 md:grid-cols-2">
              {careerSteps.map((step, index) => {
                const progress = Math.round(((index + 1) / careerSteps.length) * 100);
                return (
                  <Card
                    key={step.key}
                    className={[
                      "relative overflow-hidden p-5",
                      step.highlight
                        ? "border-rose-500/40 bg-rose-500/5 [--glow:rgba(244,63,94,0.3)]"
                        : ""
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-3xl",
                        step.highlight ? "bg-rose-500/20" : "bg-sky-500/10"
                      ].join(" ")}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold",
                            step.highlight
                              ? "border-rose-400/60 bg-rose-500/10 text-rose-200"
                              : "border-white/10 bg-white/5 text-slate-200/70"
                          ].join(" ")}
                        >
                          {step.key}
                        </span>
                        <Badge>{pick(locale, step.phase)}</Badge>
                      </div>
                      <span className="text-xs text-slate-200/60">{pick(locale, step.duration)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-50">
                      {pick(locale, step.title)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-200/70">
                      {pick(locale, step.summary)}
                    </p>
                    <div className="mt-4 h-1 w-full rounded-full bg-white/10">
                      <div
                        className={[
                          "h-full rounded-full",
                          step.highlight ? "bg-rose-400/80" : "bg-sky-400/70"
                        ].join(" ")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {step.badge ? (
                      <span className="mt-4 inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200/80">
                        {pick(locale, step.badge)}
                      </span>
                    ) : null}
                  </Card>
                );
              })}
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <Card className="p-6">
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                  {pick(locale, { zh: "成长加速器", en: "Growth accelerator" })}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-slate-50">
                  {pick(locale, { zh: "把晋升路径拆成可执行动作", en: "Turn progression into actions" })}
                </h3>
                <div className="mt-4 space-y-3 text-sm text-slate-200/75">
                  {careerHighlights.map((item) => (
                    <div key={item.title.en} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-50">
                        {pick(locale, item.title)}
                      </div>
                      <div className="mt-1 text-xs text-slate-200/60">
                        {pick(locale, item.desc)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                  {pick(locale, { zh: "关键指标", en: "Key metrics" })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {careerMetrics.map((metric) => (
                    <div key={metric.label.en} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                        {pick(locale, metric.label)}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">
                        {pick(locale, metric.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                  {pick(locale, { zh: "阶段速览", en: "Stage snapshot" })}
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-200/75">
                  {careerSteps.slice(0, 5).map((step) => (
                    <div key={`snapshot-${step.key}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-200/60">{pick(locale, step.phase)}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-50">{pick(locale, step.title)}</div>
                      </div>
                      <span className="text-xs text-slate-200/60">{pick(locale, step.duration)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Section>

      <Section
        eyebrow={tHome("markets.eyebrow")}
        title={tHome("markets.title")}
        lead={tHome("markets.lead")}
      >
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {homeMarketsCoverage.map((market) => {
            const pitfalls = pickLocale(locale, market.pitfalls);
            const focus = pickLocale(locale, market.focus);
            return (
              <Card key={market.key} className="p-7">
                <div className="flex items-center justify-between gap-3">
                  <Badge>{pickLocale(locale, market.title)}</Badge>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                      {tHome("markets.labels.pitfalls")}
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                      {pitfalls.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                      {tHome("markets.labels.focus")}
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                      {focus.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Card variant="glass" className="mt-6 p-5">
                  <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                    {tHome("markets.labels.scenario")}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-100/85">
                    {pickLocale(locale, market.scenario)}
                  </p>
                </Card>
              </Card>
            );
          })}
        </div>
      </Section>

      <section className="fx-section">
        <span className="fx-eyebrow">{tHome("pillars.eyebrow")}</span>
        <h2 className="fx-h2">{tHome("pillars.title")}</h2>
        <p className="fx-lead">{tHome("pillars.lead")}</p>
        <PillarsCognitiveMap
          title={tHome("pillars.title")}
          subtitle={tHome("pillars.lead")}
          ctaLabel={tHome("pillars.cta")}
          pillars={[
            {
              key: "mind",
              label: tCommon("labels.mind" as any),
              title: tHome("pillars.mind.title"),
              def: tHome("pillars.mind.def"),
              points: ["p1", "p2", "p3"].map((p) => tHome(`pillars.mind.${p}`)),
              href: "/framework#mind"
            },
            {
              key: "market",
              label: tCommon("labels.market" as any),
              title: tHome("pillars.market.title"),
              def: tHome("pillars.market.def"),
              points: ["p1", "p2", "p3"].map((p) => tHome(`pillars.market.${p}`)),
              href: "/framework#market"
            },
            {
              key: "price",
              label: tCommon("labels.price" as any),
              title: tHome("pillars.price.title"),
              def: tHome("pillars.price.def"),
              points: ["p1", "p2", "p3"].map((p) => tHome(`pillars.price.${p}`)),
              href: "/framework#price"
            }
          ]}
        />
      </section>

      <Section
        id="home-stories"
        eyebrow={pick(locale, { zh: "学员感言", en: "Student Voices" })}
        title={pick(locale, { zh: "学员感言 & 收益展示", en: "Student stories & performance" })}
        lead={pick(locale, {
          zh: "来自真实学员的训练反馈与阶段成果（示意），持续更新。",
          en: "Illustrative snapshots of trainee feedback and progress, updated continuously."
        })}
      >
        <div className="mt-10">
          <EquityCurveTestimonials locale={locale} />
        </div>
      </Section>

      <Section
        id="home-partners"
        eyebrow={pick(locale, { zh: "行业参考", en: "Industry Reference" })}
        title={pick(locale, {
          zh: "参考行业主流平台与数据生态",
          en: "Reference platforms across the trading ecosystem"
        })}
        lead={pick(locale, {
          zh: "品牌与工具仅作行业参考，列表持续更新。",
          en: "Logos are industry references only; list updates over time."
        })}
      >
        <div className="mt-10">
          <PartnersMarquee items={partnerItems} />
        </div>
      </Section>
      <section className="fx-section">
        <div className="relative rounded-[2.9rem] bg-gradient-to-br from-cyan-500/30 via-slate-950/30 to-rose-500/30 p-[1px]">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-slate-950/60 px-8 py-12 md:px-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_50%),radial-gradient(circle_at_80%_10%,rgba(244,63,94,0.14),transparent_55%)]" />
            <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <span className="fx-eyebrow">
                {pick(locale, { zh: "准备开启", en: "Ready to Start" })}
              </span>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
                {pick(locale, {
                  zh: "准备好开启你的外汇交易员生涯了吗？",
                  en: "Ready to launch your FX trading career?"
                })}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200/75 md:text-lg">
                {pick(locale, {
                  zh: "时间是唯一成本，淘汰是最大风险。现在就开始建立你的执行系统。",
                  en: "Time is the only cost and inertia is the biggest risk. Start building your execution system."
                })}
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                {pick(locale, {
                  zh: "评估通过后开放实盘资金通道",
                  en: "Live capital access after evaluation"
                })}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/contact" locale={locale} variant="primary">
                  {pick(locale, { zh: "立即预约面试", en: "Book an Interview" })}
                </ButtonLink>
                <ButtonLink href="/about" locale={locale} variant="secondary">
                  {pick(locale, { zh: "了解我们", en: "About FxLocus" })}
                </ButtonLink>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {ctaHighlights.map((item) => (
                  <div
                    key={item.title.en}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="text-xs font-semibold text-slate-200/60">
                      {pick(locale, item.desc)}
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-50">
                      {pick(locale, item.title)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Card variant="glass" className="relative overflow-hidden p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_55%)]" />
                <div className="relative">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {pick(locale, { zh: "训练窗口", en: "Training window" })}
                  </div>
                  <div className="mt-4 text-3xl font-semibold text-slate-50">24/7</div>
                  <p className="mt-2 text-sm text-slate-200/70">
                    {pick(locale, {
                      zh: "随时进入训练流程，匹配审核与节奏安排。",
                      en: "Start anytime with matched review cadence."
                    })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="fx-pill border-emerald-400/30 text-emerald-200/80">
                      {pick(locale, { zh: "7天内可入训", en: "Onboard in 7 days" })}
                    </span>
                    <span className="fx-pill border-sky-400/30 text-sky-200/80">
                      {pick(locale, { zh: "一对一审核", en: "1:1 review" })}
                    </span>
                  </div>
                </div>
              </Card>

              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {pick(locale, { zh: "训练节奏", en: "Training cadence" })}
                  </div>
                  <span className="fx-pill border-white/10 text-slate-200/70">SOP</span>
                </div>
                <div className="mt-4 space-y-3">
                  {ctaSteps.map((step) => (
                    <div key={step.key} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-100/80">
                        {step.key}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-50">
                          {pick(locale, step.title)}
                        </div>
                        <div className="text-xs text-slate-200/60">
                          {pick(locale, step.desc)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ctaStats.map((item) => (
              <div key={item.value} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-2xl font-semibold text-slate-50">{item.value}</div>
                <div className="mt-1 text-xs text-slate-200/60">{pick(locale, item.label)}</div>
              </div>
            ))}
          </div>

            <p className="mt-8 text-xs leading-5 text-slate-200/60">{tRisk("footer")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
