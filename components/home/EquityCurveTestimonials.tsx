"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/i18n/routing";
import { TestimonialsCarousel, type TestimonialItem } from "@/components/home/TestimonialsCarousel";

type LocalizedText = { zh: string; en: string };

type CurveTone = "sky" | "rose" | "emerald" | "amber" | "violet";

type CurveProfile = {
  name: LocalizedText;
  role: LocalizedText;
  summary: LocalizedText;
  review: LocalizedText;
  rating: number;
  highlight?: LocalizedText;
  stat?: LocalizedText;
  tone?: CurveTone;
};

type CurveApiItem = { fileName: string; mtimeMs: number };
type CurveApiResponse = { ok: boolean; items?: CurveApiItem[] };

function pick(locale: Locale, value: LocalizedText) {
  return locale === "en" ? value.en : value.zh;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type YearMonth = { year: number; month: number };

const TIMELINE_START: YearMonth = { year: 2023, month: 1 };
const TIMELINE_END: YearMonth = { year: 2026, month: 1 };

function formatYearMonth(locale: Locale, year: number, month: number) {
  const safeMonth = Math.min(12, Math.max(1, month));
  if (locale === "en") return `${MONTHS_EN[safeMonth - 1]} ${year}`;
  return `${year}年${safeMonth}月`;
}

function periodFromMtimeMs(locale: Locale, mtimeMs: number) {
  const date = new Date(mtimeMs);
  if (Number.isNaN(date.getTime())) return locale === "en" ? "—" : "—";
  return formatYearMonth(locale, date.getFullYear(), date.getMonth() + 1);
}

function extractCurveIndex(fileName: string) {
  const match = fileName.match(/\((\d+)\)/);
  return match ? Number(match[1]) : undefined;
}

function buildMonthRange(start: YearMonth, end: YearMonth): YearMonth[] {
  const months: YearMonth[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function buildTimeline(count: number): YearMonth[] {
  if (count <= 0) return [];
  const months = buildMonthRange(TIMELINE_START, TIMELINE_END);
  if (count === 1) return [months[0]];

  const steps: number[] = [];
  let seed = 37;
  for (let i = 0; i < count - 1; i += 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    const weight = 0.6 + rand * 2.2 + (i % 7 === 0 ? 0.7 : 0);
    steps.push(weight);
  }

  const total = steps.reduce((sum, value) => sum + value, 0);
  let acc = 0;
  const timeline = [months[0]];
  steps.forEach((step) => {
    acc += step;
    const ratio = total ? acc / total : 0;
    const index = Math.min(months.length - 1, Math.max(0, Math.round(ratio * (months.length - 1))));
    timeline.push(months[index]);
  });

  return timeline;
}

function timelineSortKey(fileName: string) {
  const curveIndex = extractCurveIndex(fileName) ?? Number.POSITIVE_INFINITY;
  return curveIndex === 28 ? -1 : curveIndex;
}

const highlightDefault: LocalizedText = { zh: "收益曲线", en: "Equity curve" };
const highlightElite: LocalizedText = { zh: "优秀曲线", en: "Top curve" };

const surnameEnMap: Record<string, string> = {
  曹: "Cao",
  陈: "Chen",
  杜: "Du",
  冯: "Feng",
  郭: "Guo",
  何: "He",
  黄: "Huang",
  李: "Li",
  林: "Lin",
  孙: "Sun",
  唐: "Tang",
  王: "Wang",
  吴: "Wu",
  许: "Xu",
  张: "Zhang",
  赵: "Zhao",
  郑: "Zheng",
  周: "Zhou",
  徐: "Xu"
};

function toEnglishName(zhName: string, prefix: "Trainee" | "Trader") {
  const surname = zhName.slice(0, 1);
  const surnameEn = surnameEnMap[surname] ?? surname;
  return `${prefix} ${surnameEn}`;
}

const curveProfileOverrides: Record<number, CurveProfile> = {
  28: {
    name: { zh: "杜队长", en: "Captain Du" },
    role: { zh: "团队长", en: "Team Lead" },
    summary: {
      zh: "以中大周期为主，节奏放慢后稳定度明显提升。",
      en: "Focused on higher timeframes; slowing cadence improved stability."
    },
    review: {
      zh: "只做确认后的结构段，错了按计划退出不补单。",
      en: "Trades only confirmed structure legs; exits on plan without re-entry."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "emerald"
  },
  27: {
    name: { zh: "曹队长", en: "Captain Cao" },
    role: { zh: "团队长", en: "Team Lead" },
    summary: {
      zh: "趋势段更专注，过滤低质量震荡。",
      en: "More trend-focused, filtering choppy ranges."
    },
    review: {
      zh: "入场前先写边界与证伪，持仓更从容。",
      en: "Writes boundaries and falsification before entry; holds with more composure."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "sky"
  },
  4: {
    name: { zh: "吴助教", en: "Assistant 吴" },
    role: { zh: "助教", en: "Assistant Coach" },
    summary: {
      zh: "复盘节奏固定，执行偏差会被及时标注。",
      en: "Review cadence is fixed; deviations get flagged quickly."
    },
    review: {
      zh: "更关注止损一致性，而不是短期盈亏。",
      en: "Focuses on stop consistency over short-term PnL."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "violet"
  },
  25: {
    name: { zh: "王助教", en: "Assistant 王" },
    role: { zh: "助教", en: "Assistant Coach" },
    summary: {
      zh: "偏保守风格，回撤后收敛速度快。",
      en: "Conservative style with fast drawdown recovery."
    },
    review: {
      zh: "用评分卡跟踪执行偏差，改错更明确。",
      en: "Uses scorecards to track deviations and correct them."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "amber"
  },
  5: {
    name: { zh: "任教练", en: "Coach 任" },
    role: { zh: "教练", en: "Coach" },
    summary: {
      zh: "强调纪律与复盘，动作标准化。",
      en: "Emphasizes discipline and standardized execution."
    },
    review: {
      zh: "每周只修正一条高频错误，效果更可见。",
      en: "Fixes one frequent error per week for clearer progress."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "rose"
  },
  3: {
    name: { zh: "张教练", en: "Coach 张" },
    role: { zh: "教练", en: "Coach" },
    summary: {
      zh: "交易频率下降，质量提升。",
      en: "Lower frequency with higher quality setups."
    },
    review: {
      zh: "不追单，错了等下一次结构。",
      en: "No chase trades; waits for the next structure after a loss."
    },
    rating: 5,
    highlight: highlightElite,
    tone: "emerald"
  },
  1: {
    name: { zh: "杜同学", en: "Trainee Du" },
    role: { zh: "学员", en: "Trainee" },
    summary: {
      zh: "从频繁试单转为低频A类结构。",
      en: "Moved from frequent probing to low-frequency A setups."
    },
    review: {
      zh: "开始严格执行入场前检查表。",
      en: "Now consistently runs the pre-trade checklist."
    },
    rating: 4,
    highlight: highlightDefault,
    tone: "sky"
  },
  18: {
    name: { zh: "李交易员", en: "Trader Li" },
    role: { zh: "交易员", en: "Trader" },
    summary: {
      zh: "盘整期减少交易，回撤更可控。",
      en: "Trades less in ranges; drawdowns stay controlled."
    },
    review: {
      zh: "把证伪点写进计划，止损更统一。",
      en: "Writes falsification into the plan; stops are more consistent."
    },
    rating: 4,
    highlight: highlightDefault,
    tone: "amber"
  }
};

const curveProfileOverridesByFile: Record<string, CurveProfile> = {
  "d87f3d05707cd68e94c551fe3b5c0a62.png": {
    name: { zh: "尹学员", en: "Trainee Yin" },
    role: { zh: "学员", en: "Trainee" },
    summary: {
      zh: "执行节奏稳定后，亏损波动明显收敛。",
      en: "After stabilizing cadence, drawdowns became tighter."
    },
    review: {
      zh: "不再随意加仓，亏损后严格冷却。",
      en: "No more impulsive sizing; strict cooldowns after losses."
    },
    rating: 4,
    highlight: highlightDefault,
    tone: "sky"
  }
};

const curvePeriodOverridesByFile: Record<string, YearMonth> = {
  "d87f3d05707cd68e94c551fe3b5c0a62.png": { year: 2026, month: 1 }
};

const traineeSummaryGood: LocalizedText[] = [
  { zh: "开始固定周复盘，入场理由更清晰。", en: "Started weekly reviews with clearer entry rationale." },
  { zh: "从追行情转为等结构确认。", en: "Shifted from chasing moves to waiting for structure." },
  { zh: "止损位置开始统一，执行更稳。", en: "Stops are now standardized; execution is steadier." },
  { zh: "交易前检查能执行到位，冲动单减少。", en: "Pre-trade checks are executed; impulse trades dropped." },
  { zh: "只做A类机会，频率下降但更可控。", en: "Only A setups now - lower frequency but more control." },
  { zh: "把风险写进规则，仓位更稳定。", en: "Risk is written into rules; sizing is steadier." }
];

const traineeReviewGood: LocalizedText[] = [
  { zh: "亏损后强制冷却，减少报复性交易。", en: "Uses cooldowns after losses to avoid revenge trades." },
  { zh: "开始记录证伪点，错了更快退出。", en: "Records falsification points for quicker exits." },
  { zh: "复盘里会标注同类错误，便于纠偏。", en: "Tags recurring mistakes in reviews for corrections." },
  { zh: "在高波动日主动降仓，不硬扛。", en: "Cuts size on high-vol days instead of forcing it." },
  { zh: "对关键位更谨慎，少做模糊区。", en: "More cautious around key levels; avoids gray zones." }
];

const traderSummaryGood: LocalizedText[] = [
  { zh: "环境识别更稳定，进入区更清晰。", en: "Regime recognition is stable with clearer entry zones." },
  { zh: "把R:R写进计划，执行更一致。", en: "R:R is written into plans for consistent execution." },
  { zh: "波动分层后，仓位调整更有节奏。", en: "Volatility tiers guide sizing with better cadence." },
  { zh: "结构与位置优先，信号依赖明显减少。", en: "Structure/location first; less signal dependence." },
  { zh: "减少盘整期尝试，回撤更可控。", en: "Fewer range attempts; drawdowns are more controlled." }
];

const traderReviewGood: LocalizedText[] = [
  { zh: "用周度样本回测对齐规则，再上实盘。", en: "Aligns rules with weekly samples before live trades." },
  { zh: "分批进出场更规范，不追单。", en: "Scaled entries/exits are cleaner with no chase trades." },
  { zh: "持仓前先写证伪与退出方案。", en: "Writes falsification and exit plans before holding." },
  { zh: "复盘重点从盈亏转向执行偏差。", en: "Reviews focus on execution deviations over PnL." }
];

const traineeSummaryFix: LocalizedText[] = [
  { zh: "仍在磨合期，偶尔追单。", en: "Still in refinement; occasional chase trades." },
  { zh: "规则记录不完整，执行一致性偏弱。", en: "Rule tracking is incomplete; consistency is weak." },
  { zh: "止损设置还偏随意，需要统一标准。", en: "Stops are still arbitrary; needs standardization." }
];

const traineeReviewFix: LocalizedText[] = [
  { zh: "建议把错误分类写清，逐条纠偏。", en: "Needs clear error categories and targeted fixes." },
  { zh: "复盘频率不稳，先保证每周一次。", en: "Review cadence is unstable; aim for weekly." },
  { zh: "高频时易失控，先压低频率。", en: "High frequency causes slips; reduce frequency first." }
];

const traderSummaryFix: LocalizedText[] = [
  { zh: "节奏起伏，盘整期仍有冲动单。", en: "Cadence fluctuates; impulse trades in ranges persist." },
  { zh: "风险执行有偏差，需要更严格闸门。", en: "Risk execution drifts; needs stricter gates." }
];

const traderReviewFix: LocalizedText[] = [
  { zh: "先统一证伪写法，再扩大仓位。", en: "Standardize falsification before scaling size." },
  { zh: "减少反手冲动，等确认后再做。", en: "Avoid flip trades; wait for confirmation." }
];

const traineeNamesZh = [
  "李学员",
  "王学员",
  "赵学员",
  "陈学员",
  "刘学员",
  "黄学员",
  "周学员",
  "吴学员",
  "郑学员",
  "孙学员",
  "何学员",
  "林学员",
  "唐学员",
  "许学员",
  "冯学员"
];

const traderNamesZh = [
  "王交易员",
  "赵交易员",
  "陈交易员",
  "刘交易员",
  "黄交易员",
  "周交易员",
  "吴交易员",
  "郑交易员",
  "孙交易员",
  "何交易员",
  "林交易员",
  "唐交易员",
  "许交易员",
  "冯交易员"
];

function buildFallbackProfile(curveIndex: number): CurveProfile {
  const isTrader = curveIndex % 2 === 1;
  const zhName = isTrader
    ? traderNamesZh[curveIndex % traderNamesZh.length]
    : traineeNamesZh[curveIndex % traineeNamesZh.length];

  const rating = curveIndex % 11 === 0 ? 3 : curveIndex % 7 === 0 ? 4 : 4;
  const summaryPool =
    rating >= 4
      ? isTrader
        ? traderSummaryGood
        : traineeSummaryGood
      : isTrader
        ? traderSummaryFix
        : traineeSummaryFix;
  const reviewPool =
    rating >= 4
      ? isTrader
        ? traderReviewGood
        : traineeReviewGood
      : isTrader
        ? traderReviewFix
        : traineeReviewFix;
  const summary = summaryPool[curveIndex % summaryPool.length];
  const review = reviewPool[curveIndex % reviewPool.length];

  return {
    name: { zh: zhName, en: toEnglishName(zhName, isTrader ? "Trader" : "Trainee") },
    role: isTrader ? { zh: "交易员", en: "Trader" } : { zh: "学员", en: "Trainee" },
    summary,
    review,
    rating,
    highlight: highlightDefault,
    tone: isTrader ? "emerald" : "sky"
  };
}

function buildCarouselItems(files: CurveApiItem[], locale: Locale): TestimonialItem[] {
  if (files.length === 0) return [];

  const sorted = [...files].sort((a, b) => a.mtimeMs - b.mtimeMs || a.fileName.localeCompare(b.fileName));
  const timelineOrder = [...files].sort((a, b) => {
    const keyA = timelineSortKey(a.fileName);
    const keyB = timelineSortKey(b.fileName);
    if (keyA !== keyB) return keyA - keyB;
    return a.fileName.localeCompare(b.fileName);
  });
  const timeline = buildTimeline(timelineOrder.length);
  const timelineByFile = new Map<string, YearMonth>();
  timelineOrder.forEach((file, index) => {
    const month = timeline[index];
    if (month) timelineByFile.set(file.fileName, month);
  });

  return sorted.map((file, position) => {
    const curveIndex = extractCurveIndex(file.fileName) ?? position + 1;
    const profile =
      curveProfileOverridesByFile[file.fileName] ??
      curveProfileOverrides[curveIndex] ??
      buildFallbackProfile(curveIndex);
    const assigned = timelineByFile.get(file.fileName);
    const overridePeriod = curvePeriodOverridesByFile[file.fileName];
    const period = overridePeriod
      ? formatYearMonth(locale, overridePeriod.year, overridePeriod.month)
      : assigned
        ? formatYearMonth(locale, assigned.year, assigned.month)
        : periodFromMtimeMs(locale, file.mtimeMs);
    const curveImage = `/EquityCurve/${encodeURI(file.fileName)}`;

    return {
      id: `equity-${curveIndex}-${position}`,
      name: pick(locale, profile.name),
      role: pick(locale, profile.role),
      summary: pick(locale, profile.summary),
      review: pick(locale, profile.review),
      rating: profile.rating,
      period,
      highlight: pick(locale, profile.highlight ?? highlightDefault),
      stat: profile.stat ? pick(locale, profile.stat) : undefined,
      tone: profile.tone,
      curveImage,
      curveId: String(curveIndex)
    };
  });
}

export function EquityCurveTestimonials({
  locale
}: {
  locale: Locale;
}) {
  const [files, setFiles] = useState<CurveApiItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/equity-curves", { cache: "no-store" });
        const data = (await res.json()) as CurveApiResponse;
        if (!data?.ok || !Array.isArray(data.items)) {
          throw new Error("EQUITY_CURVE_LIST_FAILED");
        }
        if (!cancelled) setFiles(data.items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "EQUITY_CURVE_LIST_FAILED");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => buildCarouselItems(files, locale), [files, locale]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200/70">
        {error ? "收益曲线加载失败，请刷新重试。" : "正在加载收益曲线…"}
      </div>
    );
  }

  return <TestimonialsCarousel items={items} />;
}
