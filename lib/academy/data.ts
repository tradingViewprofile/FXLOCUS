import type { Locale } from "@/i18n/routing";
import type { Category, Lesson, LessonSection, LessonToolOutput } from "./types";

type Localized<T> = { zh: T; en: T };

type CategorySeed = {
  id: string;
  title: Localized<string>;
  desc: Localized<string>;
  icon: string;
};

type LessonSectionSeed = {
  id: string;
  title: Localized<string>;
  summary: Localized<string>;
  content: Localized<string>;
  accordions: {
    id: string;
    title: Localized<string>;
    content: Localized<string>;
  }[];
};

type LessonChecklistSeed = {
  id: string;
  text: Localized<string>;
  why: Localized<string>;
  doneByDefault?: boolean;
};

type LessonCaseSeed = {
  id: string;
  title: Localized<string>;
  setup: Localized<string>;
  execution: Localized<string>;
  result: Localized<string>;
  review: Localized<string>;
};

type LessonToolInputSeed = {
  id: string;
  label: Localized<string>;
  unit?: Localized<string>;
  placeholder?: Localized<string>;
  defaultValue?: number;
};

type LessonToolSeed = {
  id: string;
  type: string;
  title: Localized<string>;
  inputs?: LessonToolInputSeed[];
  output?: Localized<LessonToolOutput>;
  templateText?: Localized<string>;
};

type LessonFaqSeed = {
  q: Localized<string>;
  a: Localized<string>;
};

type LessonSeed = {
  id: string;
  slug: string;
  categoryId: string;
  title: Localized<string>;
  subtitle: Localized<string>;
  summary: Localized<string>;
  readTime: Localized<string>;
  level: Localized<string>;
  updatedAt: Localized<string>;
  tags: Localized<string[]>;
  tldr: Localized<[string, string, string]>;
  toc: string[];
  sections: LessonSectionSeed[];
  checklistItems: LessonChecklistSeed[];
  cases: LessonCaseSeed[];
  tools: LessonToolSeed[];
  faq: LessonFaqSeed[];
};

const categories: CategorySeed[] = [
  {
    id: "fundamentals",
    title: { zh: "基础知识", en: "Fundamentals" },
    desc: {
      zh: "建立交易语言与市场运行机制认知。",
      en: "Build the core language of markets and trading mechanics."
    },
    icon: "Compass"
  },
  {
    id: "technical",
    title: { zh: "技术分析", en: "Technical Analysis" },
    desc: {
      zh: "用结构、趋势与指标读懂价格行为。",
      en: "Read price action with structure, trends, and indicators."
    },
    icon: "Activity"
  },
  {
    id: "strategy",
    title: { zh: "交易策略", en: "Trading Strategies" },
    desc: {
      zh: "把信号转化为可执行的剧本与规则。",
      en: "Turn signals into executable playbooks."
    },
    icon: "Workflow"
  },
  {
    id: "risk",
    title: { zh: "风险管理", en: "Risk Management" },
    desc: {
      zh: "用规则控制回撤，保护资金曲线。",
      en: "Protect equity with consistent risk rules."
    },
    icon: "Shield"
  }
];

const lessons: LessonSeed[] = [
  {
    id: "lesson-fundamentals-structure",
    slug: "market-structure-costs",
    categoryId: "fundamentals",
    title: { zh: "市场结构与交易成本", en: "Market Structure & Trading Costs" },
    subtitle: {
      zh: "学完能量化成本并评估策略真实期望值",
      en: "Quantify costs and evaluate true expectancy"
    },
    summary: {
      zh: "理解结构、流动性与成本如何重塑胜率和盈亏比。",
      en: "Understand how structure, liquidity, and friction reshape R:R and win rate."
    },
    readTime: { zh: "18分钟", en: "18 min" },
    level: { zh: "入门", en: "Beginner" },
    updatedAt: { zh: "2025年10月", en: "Oct 2025" },
    tags: {
      zh: ["结构", "成本", "期望值"],
      en: ["Structure", "Costs", "Expectancy"]
    },
    tldr: {
      zh: [
        "成本=点差+滑点+隔夜费，必须计入每一笔交易",
        "结构决定信号有效期，趋势与区间的意义不同",
        "先算成本阈值再设计R:R"
      ],
      en: [
        "Cost = spread + slippage + swaps for every trade",
        "Structure defines signal shelf-life: trend vs range",
        "Set cost thresholds before designing R:R"
      ]
    },
    toc: ["what-it-is", "when-to-use", "when-not", "step-by-step", "mistakes", "risk", "template"],
    sections: [
      {
        id: "what-it-is",
        title: { zh: "是什么", en: "What it is" },
        summary: {
          zh: "结构决定价格的节奏，成本决定优势能否存活。",
          en: "Structure sets the rhythm. Costs decide if the edge survives."
        },
        content: {
          zh: "把成本当成固定对手，而不是偶发事件。市场结构决定信号的有效期与稳定性。",
          en: "Treat costs as a constant opponent, not an accident. Structure defines how long a signal stays valid."
        },
        accordions: [
          {
            id: "structure-layers",
            title: { zh: "结构层级", en: "Structure layers" },
            content: {
              zh: "一级趋势/区间，二级波段/回撤，三级微结构/流动性。",
              en: "Layer 1 trend/range, layer 2 swing/pullback, layer 3 micro-structure/liquidity."
            }
          },
          {
            id: "cost-stack",
            title: { zh: "成本三层", en: "Cost stack" },
            content: {
              zh: "点差决定入场起跑线，滑点决定执行偏差，隔夜费决定持仓成本。",
              en: "Spread sets the starting line, slippage shifts execution, swaps tax holding time."
            }
          }
        ]
      },
      {
        id: "when-to-use",
        title: { zh: "适用条件", en: "When to use" },
        summary: {
          zh: "适合建立策略前、复盘盈亏波动、优化交易时段。",
          en: "Use before building a strategy, during drawdown review, or when optimizing sessions."
        },
        content: {
          zh: "当你发现胜率不错但长期收益仍不稳定，先审视成本和结构。",
          en: "If win rate is decent yet long-term returns drift, inspect structure and costs first."
        },
        accordions: [
          {
            id: "when-to-use-scenarios",
            title: { zh: "典型场景", en: "Typical scenarios" },
            content: {
              zh: "频繁止损但回撤不小、突破策略失灵、品种切换后盈亏断层。",
              en: "Frequent stops with large drawdown, breakouts failing, or performance dropping after switching symbols."
            }
          }
        ]
      },
      {
        id: "when-not",
        title: { zh: "禁用条件", en: "When NOT to use" },
        summary: {
          zh: "不适合无法记录成本数据或只凭感觉决策的短线冲动交易。",
          en: "Not for impulse scalping or when cost data is missing."
        },
        content: {
          zh: "如果你无法获取稳定的点差/滑点记录，先补充数据再做结论。",
          en: "If you cannot track spread/slippage reliably, pause and gather data first."
        },
        accordions: [
          {
            id: "when-not-exceptions",
            title: { zh: "误区提醒", en: "Common trap" },
            content: {
              zh: "不要把短期盈利当成成本不存在的证明。",
              en: "Short-term wins do not mean costs are irrelevant."
            }
          }
        ]
      },
      {
        id: "step-by-step",
        title: { zh: "步骤", en: "Step-by-step" },
        summary: {
          zh: "用6步把成本纳入系统，建立稳定的结构视角。",
          en: "Six steps to embed costs into the system and stabilize structure awareness."
        },
        content: {
          zh: "- 统计过去30-50笔交易的点差、滑点、隔夜费。\n- 标记趋势/区间结构，分组统计成本占比。\n- 计算R:R在成本后的真实回报。\n- 设定成本上限与允许的滑点阈值。\n- 选择结构更清晰、成本更低的时段执行。\n- 每周复盘成本偏差并调整执行。",
          en: "- Track spread, slippage, and swaps for the last 30-50 trades.\n- Tag trend vs range and compare cost share.\n- Recalculate R:R after costs.\n- Set cost caps and slippage tolerance.\n- Trade sessions with cleaner structure and lower friction.\n- Review weekly and tune execution."
        },
        accordions: [
          {
            id: "step-example",
            title: { zh: "简易示例", en: "Quick example" },
            content: {
              zh: "当成本占目标利润的30%时，必须提高R:R或减少频次。",
              en: "If costs take 30% of target profit, raise R:R or trade less."
            }
          }
        ]
      },
      {
        id: "mistakes",
        title: { zh: "常见错误", en: "Mistakes" },
        summary: {
          zh: "只看单笔盈亏、忽略结构变化、把高波动误当优势。",
          en: "Focusing on single trades, ignoring structure shifts, mistaking volatility for edge."
        },
        content: {
          zh: "- 只看胜率不看成本。\n- 在低流动性时段硬做突破。\n- 忽略隔夜费导致持仓变亏损。",
          en: "- Track win rate but ignore costs.\n- Force breakouts in low-liquidity hours.\n- Hold overnight without accounting for swaps."
        },
        accordions: [
          {
            id: "mistake-drift",
            title: { zh: "成本漂移", en: "Cost drift" },
            content: {
              zh: "当市场进入事件窗口，成本会突然放大。提前降频。",
              en: "Costs spike around events. Reduce frequency ahead of time."
            }
          }
        ]
      },
      {
        id: "risk",
        title: { zh: "风险控制", en: "Risk" },
        summary: {
          zh: "先限定成本上限，再谈止损与仓位。",
          en: "Cap costs first, then set stops and sizing."
        },
        content: {
          zh: "- 每笔成本占计划利润不超过20%。\n- 高成本时段自动缩小仓位。\n- 成本触发阈值时暂停交易。",
          en: "- Keep cost under 20% of planned profit.\n- Reduce size during high-friction windows.\n- Pause when cost threshold is breached."
        },
        accordions: [
          {
            id: "risk-buffer",
            title: { zh: "预留缓冲", en: "Keep buffer" },
            content: {
              zh: "成本不能挤占止损空间，否则结构失效。",
              en: "Costs should never squeeze the stop, or structure becomes invalid."
            }
          }
        ]
      },
      {
        id: "template",
        title: { zh: "模板", en: "Template" },
        summary: {
          zh: "用标准模板记录成本与结构，保持可复盘。",
          en: "Use a consistent template to log costs and structure for review."
        },
        content: {
          zh: "模板内容与工具区同步，建议每周复盘一次。",
          en: "The template matches the tools panel. Review weekly."
        },
        accordions: [
          {
            id: "template-note",
            title: { zh: "使用方式", en: "How to use" },
            content: {
              zh: "记录成本后，写一句结论：是否改变执行时段。",
              en: "After logging, add one sentence on whether to change execution windows."
            }
          }
        ]
      }
    ],
    checklistItems: [
      {
        id: "record-costs",
        text: { zh: "记录最近30笔交易的点差/滑点/隔夜费", en: "Record spread/slippage/swaps for the last 30 trades" },
        why: { zh: "让成本有数据基础。", en: "Costs need real data to manage." }
      },
      {
        id: "tag-structure",
        text: { zh: "标记趋势/区间结构并对比成本占比", en: "Tag trend vs range and compare cost share" },
        why: { zh: "结构不同，成本影响也不同。", en: "Structure changes how costs matter." }
      },
      {
        id: "set-cost-cap",
        text: { zh: "为每个品种设置成本上限", en: "Set a cost cap per symbol" },
        why: { zh: "防止成本侵蚀优势。", en: "Prevent costs from eroding edge." }
      },
      {
        id: "session-selection",
        text: { zh: "选择低成本交易时段", en: "Select lower-cost sessions" },
        why: { zh: "减少执行偏差。", en: "Lower friction improves execution." }
      },
      {
        id: "update-threshold",
        text: { zh: "建立成本触发暂停规则", en: "Create a pause rule when costs spike" },
        why: { zh: "保护资金曲线稳定。", en: "Protect equity consistency." }
      },
      {
        id: "weekly-review",
        text: { zh: "每周复盘成本偏差原因", en: "Review weekly cost drift causes" },
        why: { zh: "持续优化执行质量。", en: "Continuously improve execution quality." }
      }
    ],
    cases: [
      {
        id: "case-success",
        title: { zh: "成功：低成本时段的趋势回撤", en: "Success: trend pullback in low-cost window" },
        setup: {
          zh: "欧盘与美盘重叠，流动性充足。趋势结构明确。",
          en: "London/NY overlap with strong liquidity and clear trend structure."
        },
        execution: {
          zh: "在均线回撤处挂单，成本占目标利润不到15%。",
          en: "Limit order on MA pullback, cost under 15% of target."
        },
        result: { zh: "交易按计划完成，盈亏比达标。", en: "Trade executed cleanly and met target R:R." },
        review: { zh: "结构清晰+成本低是关键。", en: "Clean structure + low costs did the job." }
      },
      {
        id: "case-failure",
        title: { zh: "失败：清淡时段追突破", en: "Failure: breakout chase in thin liquidity" },
        setup: {
          zh: "亚洲尾盘流动性不足，结构模糊。",
          en: "Late Asia session with thin liquidity and unclear structure."
        },
        execution: {
          zh: "追价入场导致滑点放大，成本占比超过40%。",
          en: "Chasing entry led to large slippage, costs over 40%."
        },
        result: { zh: "止损被放大，亏损超预期。", en: "Stop widened and loss exceeded plan." },
        review: { zh: "成本失控时不应执行策略。", en: "Do not execute when costs spike." }
      },
      {
        id: "case-edge",
        title: { zh: "边界：隔夜费侵蚀波段收益", en: "Edge: swaps erode swing profit" },
        setup: {
          zh: "日线趋势向上，计划持仓3天。",
          en: "Daily trend up, plan to hold for three days."
        },
        execution: {
          zh: "忽略隔夜费，持仓成本高于预估。",
          en: "Ignored swaps, holding cost higher than expected."
        },
        result: { zh: "收益被侵蚀至接近打平。", en: "Profit eroded to near break-even." },
        review: { zh: "中线交易也要计入隔夜费。", en: "Swaps matter even for swing trades." }
      }
    ],
    tools: [
      {
        id: "params-costs",
        type: "params",
        title: { zh: "成本基准参数", en: "Cost baseline parameters" },
        inputs: [
          {
            id: "avg-spread",
            label: { zh: "平均点差", en: "Average spread" },
            unit: { zh: "点", en: "pips" },
            placeholder: { zh: "例如 1.2", en: "e.g. 1.2" },
            defaultValue: 1.2
          },
          {
            id: "avg-slippage",
            label: { zh: "平均滑点", en: "Average slippage" },
            unit: { zh: "点", en: "pips" },
            placeholder: { zh: "例如 0.6", en: "e.g. 0.6" },
            defaultValue: 0.6
          },
          {
            id: "avg-swap",
            label: { zh: "隔夜费估算", en: "Swap estimate" },
            unit: { zh: "每手", en: "per lot" },
            placeholder: { zh: "例如 -2.5", en: "e.g. -2.5" },
            defaultValue: -2.5
          }
        ]
      },
      {
        id: "table-costs",
        type: "table",
        title: { zh: "成本结构对比", en: "Cost structure comparison" },
        output: {
          zh: {
            columns: ["场景", "成本占比", "影响", "应对"],
            rows: [
              ["欧美盘重叠", "低", "容错更高", "优先执行"],
              ["清淡时段", "高", "止损放大", "减少交易"],
              ["消息前后", "极高", "执行偏差大", "暂停或降频"]
            ],
            caption: "不同场景下成本占比与执行策略。"
          },
          en: {
            columns: ["Scenario", "Cost share", "Impact", "Response"],
            rows: [
              ["London/NY overlap", "Low", "Higher tolerance", "Prioritize trades"],
              ["Thin session", "High", "Stops widen", "Trade less"],
              ["News window", "Extreme", "Execution drift", "Pause or reduce"]
            ],
            caption: "Cost share and execution response by scenario."
          }
        }
      },
      {
        id: "template-costs",
        type: "template",
        title: { zh: "成本影响记录模板", en: "Cost impact log template" },
        templateText: {
          zh: "日期:\n品种:\n结构(趋势/区间):\n点差/滑点/隔夜费:\n成本占目标利润(%):\n结论(是否调整时段/规则):",
          en: "Date:\nSymbol:\nStructure (trend/range):\nSpread/Slippage/Swaps:\nCost share of target (%):\nConclusion (change session/rules?):"
        }
      }
    ],
    faq: [
      {
        q: { zh: "成本需要每天统计吗？", en: "Do I track costs daily?" },
        a: {
          zh: "至少每周复盘一次，并在波动或事件期加密记录。",
          en: "Review weekly at minimum, and track more during volatile periods."
        }
      },
      {
        q: { zh: "低成本就一定适合交易吗？", en: "Is low cost always good to trade?" },
        a: {
          zh: "还要结合结构清晰度与信号质量，成本只是门槛。",
          en: "You still need clear structure and valid signals. Cost is only the gate."
        }
      },
      {
        q: { zh: "隔夜费为正可以忽略吗？", en: "Can I ignore positive swaps?" },
        a: {
          zh: "不能，正负都会改变持仓期望值，要纳入计算。",
          en: "No. Both positive and negative swaps alter expectancy and must be counted."
        }
      }
    ]
  },
  {
    id: "lesson-technical-trend",
    slug: "trend-structure-mas",
    categoryId: "technical",
    title: { zh: "趋势结构与均线协同", en: "Trend Structure & Moving Average Sync" },
    subtitle: {
      zh: "学完能识别趋势阶段并定义结构化入场",
      en: "Identify trend phases and define structured entries"
    },
    summary: {
      zh: "用结构确认趋势，用均线过滤噪音，避免追涨杀跌。",
      en: "Use structure to confirm trend and MAs to filter noise."
    },
    readTime: { zh: "22分钟", en: "22 min" },
    level: { zh: "进阶", en: "Intermediate" },
    updatedAt: { zh: "2025年10月", en: "Oct 2025" },
    tags: {
      zh: ["趋势", "均线", "结构"],
      en: ["Trend", "Moving Average", "Structure"]
    },
    tldr: {
      zh: [
        "先判趋势阶段，再用均线做过滤",
        "结构拐点比指标交叉更重要",
        "入场、止损、失效必须写成清单"
      ],
      en: [
        "Define the trend phase before using MAs",
        "Structure turns matter more than indicator crosses",
        "Entry, stop, invalidation must be checklist-based"
      ]
    },
    toc: ["what-it-is", "when-to-use", "when-not", "step-by-step", "mistakes", "risk", "template"],
    sections: [
      {
        id: "what-it-is",
        title: { zh: "是什么", en: "What it is" },
        summary: {
          zh: "用结构判断趋势阶段，用均线做执行过滤。",
          en: "Structure defines trend phases, MAs filter execution."
        },
        content: {
          zh: "均线不是信号本身，而是趋势健康度的量化指标。结构是核心。",
          en: "MAs are not the signal. They quantify trend health. Structure remains primary."
        },
        accordions: [
          {
            id: "trend-phases",
            title: { zh: "趋势阶段", en: "Trend phases" },
            content: {
              zh: "启动-加速-衰竭三阶段，均线用于识别衰竭。",
              en: "Initiation, acceleration, exhaustion. MAs help spot exhaustion."
            }
          }
        ]
      },
      {
        id: "when-to-use",
        title: { zh: "适用条件", en: "When to use" },
        summary: {
          zh: "趋势明确、波段结构清晰、均线有方向性时使用。",
          en: "Use when trend is clear, swings are visible, and MAs are directional."
        },
        content: {
          zh: "结构高低点清晰且均线呈发散状态，适合趋势跟随。",
          en: "Clear swing highs/lows with expanding MAs suit trend following."
        },
        accordions: [
          {
            id: "trend-confirm",
            title: { zh: "确认方式", en: "How to confirm" },
            content: {
              zh: "至少两次回撤不破关键均线，且高低点持续抬升。",
              en: "Two pullbacks that hold key MAs with rising swing points."
            }
          }
        ]
      },
      {
        id: "when-not",
        title: { zh: "禁用条件", en: "When NOT to use" },
        summary: {
          zh: "均线纠缠、结构被多次打破、价格在区间内震荡时。",
          en: "Avoid when MAs tangle, structure breaks repeatedly, or price ranges."
        },
        content: {
          zh: "横盘区间内指标交叉频繁，容易诱发错误信号。",
          en: "In ranges, MA crosses are frequent and unreliable."
        },
        accordions: [
          {
            id: "range-trap",
            title: { zh: "区间陷阱", en: "Range trap" },
            content: {
              zh: "若均线走平且价格反复穿越，优先用区间策略。",
              en: "If MAs are flat and price crosses repeatedly, switch to range tactics."
            }
          }
        ]
      },
      {
        id: "step-by-step",
        title: { zh: "步骤", en: "Step-by-step" },
        summary: {
          zh: "先找结构，再定均线，最后写入场与失效。",
          en: "Identify structure, set MA filters, then define entry/invalidation."
        },
        content: {
          zh: "- 标记最近三段高低点，确认趋势方向。\n- 选择两条均线：结构线(慢)与执行线(快)。\n- 设定回撤到执行线+结构不破的入场条件。\n- 写明失效条件：结构破位或均线死叉。\n- 建立复盘模板，记录是否符合条件。",
          en: "- Mark last three swing highs/lows to confirm trend.\n- Choose two MAs: structure (slow) and execution (fast).\n- Enter on pullback to execution MA with intact structure.\n- Invalidate on structure break or MA cross.\n- Log every trade using a template."
        },
        accordions: [
          {
            id: "step-settings",
            title: { zh: "参数建议", en: "Suggested settings" },
            content: {
              zh: "趋势跟随常用EMA20/EMA50作为执行/结构线。",
              en: "EMA20/EMA50 are common for execution/structure lines."
            }
          }
        ]
      },
      {
        id: "mistakes",
        title: { zh: "常见错误", en: "Mistakes" },
        summary: {
          zh: "过度依赖均线交叉、忽略结构破位、入场过早。",
          en: "Over-trusting MA crosses, ignoring structure breaks, entering too early."
        },
        content: {
          zh: "- 均线交叉前抢跑。\n- 忽略趋势衰竭信号。\n- 回撤深度过大仍强行跟随。",
          en: "- Front-running MA cross.\n- Ignoring exhaustion signals.\n- Forcing trend trades after deep pullbacks."
        },
        accordions: [
          {
            id: "mistake-late",
            title: { zh: "追涨杀跌", en: "Chasing" },
            content: {
              zh: "均线延迟性强，必须用结构确认而不是追价。",
              en: "MAs lag; structure must confirm entries, not price chasing."
            }
          }
        ]
      },
      {
        id: "risk",
        title: { zh: "风险控制", en: "Risk" },
        summary: {
          zh: "趋势策略的风险在于回撤过深与假突破。",
          en: "Trend risk comes from deep pullbacks and false breaks."
        },
        content: {
          zh: "- 用结构止损替代均线止损。\n- 趋势衰竭时主动减仓。\n- 单笔风险不超过账户1%。",
          en: "- Use structure stops instead of MA stops.\n- Reduce size near exhaustion.\n- Keep risk per trade under 1%."
        },
        accordions: [
          {
            id: "risk-buffer-trend",
            title: { zh: "预留缓冲", en: "Buffer" },
            content: {
              zh: "结构止损需要留出滑点空间，避免误触。",
              en: "Structure stops need slippage buffer to avoid false stops."
            }
          }
        ]
      },
      {
        id: "template",
        title: { zh: "模板", en: "Template" },
        summary: {
          zh: "把趋势结构与均线条件写成可复用模板。",
          en: "Write structure and MA conditions into a reusable template."
        },
        content: {
          zh: "模板与工具区同步，建议每次交易后填写。",
          en: "Template matches the tools panel. Fill it after each trade."
        },
        accordions: [
          {
            id: "template-use",
            title: { zh: "填写要点", en: "What to note" },
            content: {
              zh: "记录结构高低点、均线斜率、入场理由与失效点。",
              en: "Log swing points, MA slope, entry rationale, and invalidation."
            }
          }
        ]
      }
    ],
    checklistItems: [
      {
        id: "mark-swings",
        text: { zh: "标记最近三段高低点", en: "Mark the last three swing highs/lows" },
        why: { zh: "判断趋势是否延续。", en: "Confirm if the trend persists." }
      },
      {
        id: "set-ma",
        text: { zh: "确定执行线与结构线参数", en: "Set execution and structure MA parameters" },
        why: { zh: "保持规则一致。", en: "Keep rules consistent." }
      },
      {
        id: "entry-rule",
        text: { zh: "写出入场条件清单", en: "Write a checklist for entries" },
        why: { zh: "避免追价冲动。", en: "Avoid impulsive chasing." }
      },
      {
        id: "invalidate-rule",
        text: { zh: "写出失效条件", en: "Define invalidation rules" },
        why: { zh: "防止拖延止损。", en: "Prevent delayed stops." }
      },
      {
        id: "risk-cap",
        text: { zh: "单笔风险不超过1%", en: "Keep risk per trade under 1%" },
        why: { zh: "控制回撤。", en: "Control drawdown." }
      },
      {
        id: "template-log",
        text: { zh: "每笔交易填写结构模板", en: "Log each trade in the structure template" },
        why: { zh: "形成可复盘路径。", en: "Build a reviewable trail." }
      }
    ],
    cases: [
      {
        id: "case-success",
        title: { zh: "成功：趋势回撤后二次启动", en: "Success: second push after pullback" },
        setup: {
          zh: "价格形成更高低点，EMA50向上。",
          en: "Price makes higher lows with upward EMA50."
        },
        execution: {
          zh: "回撤至EMA20并形成小级别结构，按清单入场。",
          en: "Pullback to EMA20 with micro-structure confirmation, entry per checklist."
        },
        result: { zh: "顺势盈利，止损未被触发。", en: "Profit captured with stop intact." },
        review: { zh: "结构+均线过滤有效。", en: "Structure + MA filter worked." }
      },
      {
        id: "case-failure",
        title: { zh: "失败：均线交叉后追价", en: "Failure: chasing after MA cross" },
        setup: {
          zh: "均线刚交叉但结构未确认。",
          en: "MA cross occurred but structure was unclear."
        },
        execution: {
          zh: "追价入场导致高位被套。",
          en: "Chased entry and got trapped at the top."
        },
        result: { zh: "短期回撤触发止损。", en: "Quick pullback hit the stop." },
        review: { zh: "先确认结构再跟随。", en: "Confirm structure before following." }
      },
      {
        id: "case-edge",
        title: { zh: "边界：趋势衰竭反向急跌", en: "Edge: trend exhaustion reversal" },
        setup: {
          zh: "价格创新高但均线斜率放缓。",
          en: "Price makes new high while MA slope flattens."
        },
        execution: {
          zh: "仍按原规则入场，未考虑衰竭。",
          en: "Entered by old rules without considering exhaustion."
        },
        result: { zh: "急跌触发止损。", en: "Sharp reversal hit stop." },
        review: { zh: "衰竭阶段需减仓或观望。", en: "Reduce size or pause during exhaustion." }
      }
    ],
    tools: [
      {
        id: "params-ma",
        type: "params",
        title: { zh: "均线参数建议", en: "MA parameter suggestions" },
        inputs: [
          {
            id: "ma-fast",
            label: { zh: "执行线", en: "Execution MA" },
            unit: { zh: "EMA", en: "EMA" },
            placeholder: { zh: "例如 20", en: "e.g. 20" },
            defaultValue: 20
          },
          {
            id: "ma-slow",
            label: { zh: "结构线", en: "Structure MA" },
            unit: { zh: "EMA", en: "EMA" },
            placeholder: { zh: "例如 50", en: "e.g. 50" },
            defaultValue: 50
          }
        ]
      },
      {
        id: "table-trend",
        type: "table",
        title: { zh: "趋势与震荡对比", en: "Trend vs range comparison" },
        output: {
          zh: {
            columns: ["结构", "价格行为", "均线状态", "动作"],
            rows: [
              ["趋势", "高低点持续抬升", "均线发散有斜率", "回撤跟随"],
              ["震荡", "高低点水平", "均线纠缠", "区间策略"],
              ["衰竭", "新高/新低失败", "均线走平", "减仓或观望"]
            ],
            caption: "用结构+均线快速判断当前环境。"
          },
          en: {
            columns: ["Structure", "Price action", "MA state", "Action"],
            rows: [
              ["Trend", "Rising swing points", "MAs diverge with slope", "Follow pullbacks"],
              ["Range", "Flat swings", "MAs tangled", "Use range tactics"],
              ["Exhaustion", "Failed new highs/lows", "MAs flatten", "Reduce or pause"]
            ],
            caption: "Use structure + MAs to classify the environment."
          }
        }
      },
      {
        id: "template-trend",
        type: "template",
        title: { zh: "趋势结构观察模板", en: "Trend structure log template" },
        templateText: {
          zh: "日期:\n品种:\n趋势阶段(启动/加速/衰竭):\n结构高低点:\n均线斜率与位置:\n入场理由:\n失效条件:",
          en: "Date:\nSymbol:\nTrend phase (init/accel/exhaust):\nSwing highs/lows:\nMA slope & position:\nEntry rationale:\nInvalidation rule:"
        }
      }
    ],
    faq: [
      {
        q: { zh: "均线参数必须固定吗？", en: "Do MA settings have to be fixed?" },
        a: {
          zh: "最好固定在一个区间内，避免频繁更改导致无法复盘。",
          en: "Keep them within a stable range to maintain reviewability."
        }
      },
      {
        q: { zh: "均线交叉是否可以作为入场信号？", en: "Can MA cross be an entry signal?" },
        a: {
          zh: "只能作为辅助，必须与结构确认一起使用。",
          en: "Only as a filter. Structure confirmation is required."
        }
      },
      {
        q: { zh: "趋势衰竭如何识别？", en: "How to spot trend exhaustion?" },
        a: {
          zh: "看结构新高失败+均线斜率放缓。",
          en: "Failed swing highs with flattening MA slope."
        }
      }
    ]
  },
  {
    id: "lesson-strategy-breakout",
    slug: "range-breakout-playbook",
    categoryId: "strategy",
    title: { zh: "区间突破策略蓝图", en: "Range Breakout Playbook" },
    subtitle: {
      zh: "学完能构建可执行的突破剧本",
      en: "Build an executable breakout playbook"
    },
    summary: {
      zh: "把区间识别、突破确认、风险控制写成规则化流程。",
      en: "Turn range detection, breakout confirmation, and risk rules into a playbook."
    },
    readTime: { zh: "20分钟", en: "20 min" },
    level: { zh: "进阶", en: "Intermediate" },
    updatedAt: { zh: "2025年11月", en: "Nov 2025" },
    tags: {
      zh: ["突破", "区间", "剧本"],
      en: ["Breakout", "Range", "Playbook"]
    },
    tldr: {
      zh: [
        "先确认区间边界，再判断突破质量",
        "突破后回踩是关键过滤",
        "固定风险与失败处理是策略核心"
      ],
      en: [
        "Define the range before judging breakout quality",
        "Retest is the key filter after breakout",
        "Fixed risk and failure handling are core"
      ]
    },
    toc: ["what-it-is", "when-to-use", "when-not", "step-by-step", "mistakes", "risk", "template"],
    sections: [
      {
        id: "what-it-is",
        title: { zh: "是什么", en: "What it is" },
        summary: {
          zh: "区间突破是结构化的趋势启动策略。",
          en: "Range breakout is a structured trend-start strategy."
        },
        content: {
          zh: "核心在于区间边界、突破动能与回踩确认。",
          en: "Focus on boundaries, breakout momentum, and retest confirmation."
        },
        accordions: [
          {
            id: "range-definition",
            title: { zh: "区间定义", en: "Defining the range" },
            content: {
              zh: "至少两次触碰上下沿，并伴随成交量收缩。",
              en: "At least two touches on both sides with contracting volume."
            }
          }
        ]
      },
      {
        id: "when-to-use",
        title: { zh: "适用条件", en: "When to use" },
        summary: {
          zh: "区间收敛、事件驱动前、波动率压缩时。",
          en: "When ranges tighten before catalysts or volatility compresses."
        },
        content: {
          zh: "波动率压缩越久，突破后的延续性越强。",
          en: "The longer the compression, the stronger the post-breakout continuation."
        },
        accordions: [
          {
            id: "breakout-sessions",
            title: { zh: "时间窗口", en: "Session window" },
            content: {
              zh: "优先选择流动性高的时段执行突破。",
              en: "Prioritize high-liquidity sessions for breakouts."
            }
          }
        ]
      },
      {
        id: "when-not",
        title: { zh: "禁用条件", en: "When NOT to use" },
        summary: {
          zh: "区间过宽、假突破频繁或缺乏动能时。",
          en: "Avoid when ranges are too wide or false breaks are frequent."
        },
        content: {
          zh: "若上沿/下沿被多次击穿，说明市场仍在震荡。",
          en: "If boundaries are repeatedly pierced, the market is still ranging."
        },
        accordions: [
          {
            id: "false-break",
            title: { zh: "假突破信号", en: "False break signals" },
            content: {
              zh: "突破后无量或快速回归区间，属于高风险。",
              en: "Low volume or quick return to range means high risk."
            }
          }
        ]
      },
      {
        id: "step-by-step",
        title: { zh: "步骤", en: "Step-by-step" },
        summary: {
          zh: "用清单构建突破剧本，执行一致。",
          en: "Use a checklist to execute breakouts consistently."
        },
        content: {
          zh: "- 标记区间高低点与压缩区。\n- 设定突破确认条件(收盘价/量能)。\n- 等待回踩确认后再入场。\n- 设置失败处理：回撤进入区间即止损。\n- 记录突破质量并复盘。",
          en: "- Mark range highs/lows and compression zone.\n- Define breakout confirmation (close/volume).\n- Enter on retest confirmation.\n- Invalidate if price returns into range.\n- Log breakout quality and review."
        },
        accordions: [
          {
            id: "step-quality",
            title: { zh: "质量评分", en: "Quality score" },
            content: {
              zh: "用1-5分评价突破动能，低于3分不做。",
              en: "Score breakout momentum 1-5, skip below 3."
            }
          }
        ]
      },
      {
        id: "mistakes",
        title: { zh: "常见错误", en: "Mistakes" },
        summary: {
          zh: "突破即追、忽视回踩、失败后不止损。",
          en: "Chasing the break, ignoring retest, failing to stop after invalidation."
        },
        content: {
          zh: "- 未等待回踩确认。\n- 在低流动性时段追突破。\n- 止损设在区间内。",
          en: "- Entering without retest confirmation.\n- Chasing in low liquidity.\n- Placing stop inside the range."
        },
        accordions: [
          {
            id: "mistake-fomo",
            title: { zh: "FOMO", en: "FOMO" },
            content: {
              zh: "突破不等于趋势，必须验证延续性。",
              en: "A breakout is not a trend until continuation is proven."
            }
          }
        ]
      },
      {
        id: "risk",
        title: { zh: "风险控制", en: "Risk" },
        summary: {
          zh: "突破失败率高，必须严格控制单笔风险。",
          en: "Breakouts fail often, so risk must be tight."
        },
        content: {
          zh: "- 单笔风险0.5%-1%。\n- 失败即退出，避免二次伤害。\n- 连续2次失败暂停。",
          en: "- Risk 0.5%-1% per trade.\n- Exit immediately on failure.\n- Pause after two consecutive fails."
        },
        accordions: [
          {
            id: "risk-breakout",
            title: { zh: "止损位置", en: "Stop placement" },
            content: {
              zh: "止损在区间外侧，避免噪音扫损。",
              en: "Stops outside the range avoid noise sweeps."
            }
          }
        ]
      },
      {
        id: "template",
        title: { zh: "模板", en: "Template" },
        summary: {
          zh: "用剧本模板记录突破质量与执行复盘。",
          en: "Use the playbook template to log breakout quality and review."
        },
        content: {
          zh: "模板与工具区同步，建议每次突破后填写。",
          en: "Template matches tools panel. Fill after each breakout."
        },
        accordions: [
          {
            id: "template-breakout",
            title: { zh: "字段建议", en: "Suggested fields" },
            content: {
              zh: "包含区间宽度、突破动能评分、回踩确认与结果。",
              en: "Include range width, momentum score, retest confirmation, and outcome."
            }
          }
        ]
      }
    ],
    checklistItems: [
      {
        id: "range-mark",
        text: { zh: "画出区间上下沿", en: "Mark range boundaries" },
        why: { zh: "确保突破定义清晰。", en: "Define the breakout clearly." }
      },
      {
        id: "confirm-break",
        text: { zh: "设置突破确认条件", en: "Set breakout confirmation rules" },
        why: { zh: "过滤假突破。", en: "Filter false breaks." }
      },
      {
        id: "wait-retest",
        text: { zh: "等待回踩确认", en: "Wait for retest confirmation" },
        why: { zh: "提高成功率。", en: "Improve success rate." }
      },
      {
        id: "risk-control",
        text: { zh: "固定单笔风险", en: "Fix risk per trade" },
        why: { zh: "防止连亏扩大。", en: "Limit drawdown streaks." }
      },
      {
        id: "fail-exit",
        text: { zh: "失败即退出", en: "Exit on failure" },
        why: { zh: "控制损失。", en: "Control loss." }
      },
      {
        id: "review-score",
        text: { zh: "记录突破质量评分", en: "Log breakout quality score" },
        why: { zh: "形成可复盘数据。", en: "Build reviewable data." }
      }
    ],
    cases: [
      {
        id: "case-success",
        title: { zh: "成功：回踩确认后的延续", en: "Success: continuation after retest" },
        setup: {
          zh: "区间收敛，成交量压缩。",
          en: "Range tightened with volume compression."
        },
        execution: {
          zh: "突破后回踩不破，按剧本入场。",
          en: "Entered on retest holding outside the range."
        },
        result: { zh: "突破延续，达到目标。", en: "Breakout continued to target." },
        review: { zh: "回踩确认提升质量。", en: "Retest confirmation raised quality." }
      },
      {
        id: "case-failure",
        title: { zh: "失败：无量突破回落", en: "Failure: low-volume breakout" },
        setup: {
          zh: "消息前夕，流动性不足。",
          en: "Pre-news window with low liquidity."
        },
        execution: {
          zh: "突破后无回踩直接追入。",
          en: "Chased without retest."
        },
        result: { zh: "价格回到区间，止损。", en: "Price returned to range, stopped out." },
        review: { zh: "缺少回踩过滤。", en: "Retest filter was missing." }
      },
      {
        id: "case-edge",
        title: { zh: "边界：假突破后真突破", en: "Edge: false break then real break" },
        setup: {
          zh: "区间上沿多次被刺破。",
          en: "Upper boundary pierced multiple times."
        },
        execution: {
          zh: "第一次失败后暂停，第二次确认再入场。",
          en: "Paused after first fail, entered on second confirmation."
        },
        result: { zh: "第二次突破成功。", en: "Second breakout succeeded." },
        review: { zh: "失败后冷却有助于过滤噪音。", en: "Cooldown helped filter noise." }
      }
    ],
    tools: [
      {
        id: "params-breakout",
        type: "params",
        title: { zh: "突破执行参数", en: "Breakout execution parameters" },
        inputs: [
          {
            id: "range-width",
            label: { zh: "区间宽度上限", en: "Max range width" },
            unit: { zh: "点", en: "pips" },
            placeholder: { zh: "例如 40", en: "e.g. 40" },
            defaultValue: 40
          },
          {
            id: "momentum-score",
            label: { zh: "动能最低评分", en: "Min momentum score" },
            unit: { zh: "1-5", en: "1-5" },
            placeholder: { zh: "例如 3", en: "e.g. 3" },
            defaultValue: 3
          }
        ]
      },
      {
        id: "table-breakout",
        type: "table",
        title: { zh: "突破质量对比", en: "Breakout quality comparison" },
        output: {
          zh: {
            columns: ["信号", "质量", "风险", "动作"],
            rows: [
              ["有量突破+回踩", "高", "低", "执行"],
              ["无量突破", "低", "高", "观望"],
              ["多次假突破", "中", "中", "降低频次"]
            ],
            caption: "用质量评分过滤突破。"
          },
          en: {
            columns: ["Signal", "Quality", "Risk", "Action"],
            rows: [
              ["Volume breakout + retest", "High", "Low", "Execute"],
              ["Low-volume breakout", "Low", "High", "Skip"],
              ["Repeated false breaks", "Medium", "Medium", "Reduce frequency"]
            ],
            caption: "Filter breakouts with quality scoring."
          }
        }
      },
      {
        id: "template-breakout",
        type: "template",
        title: { zh: "突破剧本模板", en: "Breakout playbook template" },
        templateText: {
          zh: "日期:\n品种:\n区间宽度:\n突破动能评分:\n是否回踩确认:\n入场理由:\n失效条件:\n结果与复盘:",
          en: "Date:\nSymbol:\nRange width:\nMomentum score:\nRetest confirmation:\nEntry rationale:\nInvalidation rule:\nOutcome & review:"
        }
      }
    ],
    faq: [
      {
        q: { zh: "突破一定要回踩吗？", en: "Is a retest mandatory?" },
        a: {
          zh: "回踩能过滤大量假突破，但需要结合动能与流动性。",
          en: "Retest filters many false breaks, but consider momentum and liquidity."
        }
      },
      {
        q: { zh: "突破失败后还能继续做吗？", en: "Can I trade after a failed breakout?" },
        a: {
          zh: "建议至少冷静一段时间，并重新评估区间。",
          en: "Pause and re-evaluate the range before trading again."
        }
      },
      {
        q: { zh: "区间太宽怎么办？", en: "What if the range is too wide?" },
        a: {
          zh: "宽区间突破失败率高，优先缩短周期或换品种。",
          en: "Wide ranges lower win rate; shorten timeframe or switch symbols."
        }
      }
    ]
  },
  {
    id: "lesson-risk-fixed-r",
    slug: "fixed-r-position-sizing",
    categoryId: "risk",
    title: { zh: "固定R与仓位计算", en: "Fixed R & Position Sizing" },
    subtitle: {
      zh: "学完能用统一风险单位衡量交易",
      en: "Measure every trade with one risk unit"
    },
    summary: {
      zh: "用固定R衡量盈亏，建立可追踪的风险纪律。",
      en: "Use fixed R to measure PnL and build risk discipline."
    },
    readTime: { zh: "21分钟", en: "21 min" },
    level: { zh: "进阶", en: "Intermediate" },
    updatedAt: { zh: "2025年11月", en: "Nov 2025" },
    tags: {
      zh: ["仓位", "风险", "R值"],
      en: ["Position sizing", "Risk", "R multiple"]
    },
    tldr: {
      zh: [
        "固定R让每笔交易风险可比",
        "仓位由止损距离反推",
        "日内最大亏损必须量化"
      ],
      en: [
        "Fixed R makes risk comparable across trades",
        "Size is derived from stop distance",
        "Daily max loss must be quantified"
      ]
    },
    toc: ["what-it-is", "when-to-use", "when-not", "step-by-step", "mistakes", "risk", "template"],
    sections: [
      {
        id: "what-it-is",
        title: { zh: "是什么", en: "What it is" },
        summary: {
          zh: "固定R是以固定风险金额衡量交易的系统。",
          en: "Fixed R is a system that measures trades with a constant risk amount."
        },
        content: {
          zh: "R是你愿意承受的单笔最大亏损。盈亏都以R倍数记录。",
          en: "R is the max loss per trade. PnL is recorded in R multiples."
        },
        accordions: [
          {
            id: "r-definition",
            title: { zh: "R的定义", en: "Define R" },
            content: {
              zh: "例如账户10万，单笔风险1%，则1R=1000。",
              en: "Example: account 100k, risk 1%, then 1R = 1000."
            }
          }
        ]
      },
      {
        id: "when-to-use",
        title: { zh: "适用条件", en: "When to use" },
        summary: {
          zh: "适合需要统一风险尺度、易受情绪影响的交易者。",
          en: "Ideal when you need consistent risk and emotional control."
        },
        content: {
          zh: "当你发现仓位忽大忽小、盈亏波动失控时立即引入固定R。",
          en: "Introduce fixed R when your sizing varies wildly and volatility feels out of control."
        },
        accordions: [
          {
            id: "when-to-use-account",
            title: { zh: "账户波动期", en: "During volatility" },
            content: {
              zh: "回撤期更要保持固定R，避免情绪加码。",
              en: "Stick to fixed R during drawdowns to prevent revenge sizing."
            }
          }
        ]
      },
      {
        id: "when-not",
        title: { zh: "禁用条件", en: "When NOT to use" },
        summary: {
          zh: "未明确止损或无法量化风险的交易不适用。",
          en: "Do not use when stops are unclear or risk cannot be quantified."
        },
        content: {
          zh: "没有止损距离就无法计算仓位，风险不可控。",
          en: "Without a stop distance, sizing cannot be calculated."
        },
        accordions: [
          {
            id: "when-not-discretion",
            title: { zh: "无规则交易", en: "No rules" },
            content: {
              zh: "纯主观判断不适合固定R，先建立规则。",
              en: "Pure discretion without rules should establish a process first."
            }
          }
        ]
      },
      {
        id: "step-by-step",
        title: { zh: "步骤", en: "Step-by-step" },
        summary: {
          zh: "用四步完成R值与仓位计算。",
          en: "Four steps to compute R and position size."
        },
        content: {
          zh: "- 设定每笔风险占比(例如1%)。\n- 计算1R金额 = 账户资金 x 风险占比。\n- 量化止损距离。\n- 仓位 = 1R金额 / 止损距离。",
          en: "- Set risk per trade (e.g., 1%).\n- Compute 1R = account size x risk %.\n- Measure stop distance.\n- Size = 1R / stop distance."
        },
        accordions: [
          {
            id: "step-calc",
            title: { zh: "计算示例", en: "Example" },
            content: {
              zh: "账户100k，1R=1000，止损50点，则仓位=20/点价值。",
              en: "Account 100k, 1R=1000, stop 50 pips, size = 20 per pip value."
            }
          }
        ]
      },
      {
        id: "mistakes",
        title: { zh: "常见错误", en: "Mistakes" },
        summary: {
          zh: "风险比例随情绪波动、止损距离不真实、忽略日内最大亏损。",
          en: "Letting risk % drift, unrealistic stop distances, ignoring daily max loss."
        },
        content: {
          zh: "- 交易顺利时加大风险比例。\n- 止损设得过近导致频繁被打。\n- 连续亏损仍不降低频率。",
          en: "- Raising risk % after a win streak.\n- Stops too tight causing frequent stop-outs.\n- No reduction after losing streak."
        },
        accordions: [
          {
            id: "mistake-overtrade",
            title: { zh: "过度交易", en: "Overtrading" },
            content: {
              zh: "固定R仍需控制频次，避免多次小亏叠加。",
              en: "Fixed R still needs frequency control to avoid repeated small losses."
            }
          }
        ]
      },
      {
        id: "risk",
        title: { zh: "风险控制", en: "Risk" },
        summary: {
          zh: "用日内最大亏损与连续亏损规则锁住回撤。",
          en: "Use daily max loss and consecutive loss rules to cap drawdown."
        },
        content: {
          zh: "- 日内最大亏损不超过2R。\n- 连续2-3次亏损后暂停。\n- 回撤超过阈值时降低R。",
          en: "- Daily max loss under 2R.\n- Pause after 2-3 consecutive losses.\n- Reduce R after drawdown breaches."
        },
        accordions: [
          {
            id: "risk-discipline",
            title: { zh: "纪律提醒", en: "Discipline" },
            content: {
              zh: "固定R是纪律工具，不是盈利工具。",
              en: "Fixed R is a discipline tool, not a profit tool."
            }
          }
        ]
      },
      {
        id: "template",
        title: { zh: "模板", en: "Template" },
        summary: {
          zh: "风险计划模板帮助你记录R值与执行状态。",
          en: "A risk plan template helps log R and execution state."
        },
        content: {
          zh: "模板与工具区同步，建议每周更新。",
          en: "Template matches tools panel and should be updated weekly."
        },
        accordions: [
          {
            id: "template-risk",
            title: { zh: "模板说明", en: "Template notes" },
            content: {
              zh: "记录R值、止损距离与日内最大亏损。",
              en: "Log R value, stop distance, and daily max loss."
            }
          }
        ]
      }
    ],
    checklistItems: [
      {
        id: "set-risk-percent",
        text: { zh: "设定固定风险比例", en: "Set fixed risk %" },
        why: { zh: "统一风险尺度。", en: "Standardize risk scale." }
      },
      {
        id: "calculate-r",
        text: { zh: "计算1R金额", en: "Calculate 1R amount" },
        why: { zh: "明确最大亏损。", en: "Define max loss." }
      },
      {
        id: "measure-stop",
        text: { zh: "量化止损距离", en: "Measure stop distance" },
        why: { zh: "为仓位提供依据。", en: "Provide basis for sizing." }
      },
      {
        id: "size-position",
        text: { zh: "按公式计算仓位", en: "Compute size by formula" },
        why: { zh: "避免主观加码。", en: "Avoid subjective sizing." }
      },
      {
        id: "daily-loss",
        text: { zh: "设置日内最大亏损", en: "Set daily max loss" },
        why: { zh: "防止连亏扩大。", en: "Prevent losing streak escalation." }
      },
      {
        id: "review-r",
        text: { zh: "每周复盘R值执行情况", en: "Review weekly R execution" },
        why: { zh: "保持纪律。", en: "Maintain discipline." }
      }
    ],
    cases: [
      {
        id: "case-success",
        title: { zh: "成功：固定R抑制回撤", en: "Success: fixed R limits drawdown" },
        setup: {
          zh: "连续两笔亏损后，仍保持1R规则。",
          en: "Two losses in a row, still kept 1R risk."
        },
        execution: {
          zh: "第三笔盈利2R，整体回撤被控制。",
          en: "Third trade delivered 2R, drawdown stayed contained."
        },
        result: { zh: "资金曲线恢复稳定。", en: "Equity curve stabilized." },
        review: { zh: "纪律优于情绪。", en: "Discipline beat emotion." }
      },
      {
        id: "case-failure",
        title: { zh: "失败：临时加仓导致超亏", en: "Failure: oversizing after a loss" },
        setup: {
          zh: "连续亏损后想追回损失。",
          en: "Wanted to recover losses after a streak."
        },
        execution: {
          zh: "加大仓位至2.5R，结果止损。",
          en: "Sized up to 2.5R and got stopped."
        },
        result: { zh: "单日亏损超限。", en: "Daily loss limit breached." },
        review: { zh: "违背固定R规则。", en: "Fixed R rule was broken." }
      },
      {
        id: "case-edge",
        title: { zh: "边界：止损过小导致频繁止损", en: "Edge: too tight stops" },
        setup: {
          zh: "为了提高仓位，故意缩小止损。",
          en: "Tightened stops to increase size."
        },
        execution: {
          zh: "频繁被扫损，亏损累积。",
          en: "Frequent stop-outs accumulated losses."
        },
        result: { zh: "短期亏损扩大。", en: "Short-term losses expanded." },
        review: { zh: "止损必须符合结构。", en: "Stops must match structure." }
      }
    ],
    tools: [
      {
        id: "calculator-position",
        type: "calculator",
        title: { zh: "仓位计算器", en: "Position sizing calculator" },
        inputs: [
          {
            id: "account-size",
            label: { zh: "账户资金", en: "Account size" },
            unit: { zh: "元", en: "USD" },
            placeholder: { zh: "例如 100000", en: "e.g. 100000" },
            defaultValue: 100000
          },
          {
            id: "risk-percent",
            label: { zh: "风险比例", en: "Risk %" },
            unit: { zh: "%", en: "%" },
            placeholder: { zh: "例如 1", en: "e.g. 1" },
            defaultValue: 1
          },
          {
            id: "stop-distance",
            label: { zh: "止损距离", en: "Stop distance" },
            unit: { zh: "点", en: "pips" },
            placeholder: { zh: "例如 50", en: "e.g. 50" },
            defaultValue: 50
          }
        ],
        output: {
          zh: "仓位 = (账户资金 x 风险比例) / 止损距离",
          en: "Size = (Account x Risk %) / Stop distance"
        }
      },
      {
        id: "table-risk",
        type: "table",
        title: { zh: "风险等级参考", en: "Risk tier reference" },
        output: {
          zh: {
            columns: ["风险等级", "每笔风险%", "适用阶段", "备注"],
            rows: [
              ["保守", "0.5%", "回撤期", "优先保全"],
              ["常规", "1%", "稳定期", "平衡成长"],
              ["进取", "1.5%", "顺风期", "需严格复盘"]
            ],
            caption: "根据账户状态调整风险等级。"
          },
          en: {
            columns: ["Tier", "Risk %", "Stage", "Notes"],
            rows: [
              ["Conservative", "0.5%", "Drawdown", "Capital preservation"],
              ["Standard", "1%", "Stable", "Balanced growth"],
              ["Aggressive", "1.5%", "Hot streak", "Needs strict review"]
            ],
            caption: "Adjust risk tiers based on account state."
          }
        }
      },
      {
        id: "template-risk",
        type: "template",
        title: { zh: "风险计划模板", en: "Risk plan template" },
        templateText: {
          zh: "周目标R值:\n单笔风险比例:\n日内最大亏损(R):\n连续亏损暂停规则:\n止损距离基准:\n复盘备注:",
          en: "Weekly R target:\nRisk % per trade:\nDaily max loss (R):\nPause after consecutive losses:\nStop distance baseline:\nReview notes:"
        }
      }
    ],
    faq: [
      {
        q: { zh: "R值越大越好吗？", en: "Is a larger R better?" },
        a: {
          zh: "不一定，R值应根据回撤与系统稳定性调整。",
          en: "Not always. R should match drawdown tolerance and system stability."
        }
      },
      {
        q: { zh: "止损太小怎么办？", en: "What if stops are too tight?" },
        a: {
          zh: "先确保结构有效，再决定是否扩大止损。",
          en: "Validate structure first, then widen stops if needed."
        }
      },
      {
        q: { zh: "连续亏损如何处理？", en: "How to handle a losing streak?" },
        a: {
          zh: "按规则暂停并复盘，不要加码。",
          en: "Pause and review. Do not size up."
        }
      }
    ]
  }
];

const pick = <T,>(value: Localized<T>, locale: Locale): T => value[locale] ?? value.en;

const mapSection = (seed: LessonSectionSeed, locale: Locale): LessonSection => ({
  id: seed.id,
  title: pick(seed.title, locale),
  summary: pick(seed.summary, locale),
  content: pick(seed.content, locale),
  accordions: seed.accordions.map((accordion) => ({
    id: accordion.id,
    title: pick(accordion.title, locale),
    content: pick(accordion.content, locale)
  }))
});

const mapLesson = (seed: LessonSeed, locale: Locale): Lesson => ({
  id: seed.id,
  slug: seed.slug,
  categoryId: seed.categoryId,
  title: pick(seed.title, locale),
  subtitle: pick(seed.subtitle, locale),
  summary: pick(seed.summary, locale),
  readTime: pick(seed.readTime, locale),
  level: pick(seed.level, locale),
  updatedAt: pick(seed.updatedAt, locale),
  tags: pick(seed.tags, locale),
  tldr: pick(seed.tldr, locale),
  toc: seed.toc,
  sections: seed.sections.map((section) => mapSection(section, locale)),
  checklistItems: seed.checklistItems.map((item) => ({
    id: item.id,
    text: pick(item.text, locale),
    why: pick(item.why, locale),
    doneByDefault: item.doneByDefault
  })),
  cases: seed.cases.map((item) => ({
    id: item.id,
    title: pick(item.title, locale),
    setup: pick(item.setup, locale),
    execution: pick(item.execution, locale),
    result: pick(item.result, locale),
    review: pick(item.review, locale)
  })),
  tools: seed.tools.map((tool) => ({
    id: tool.id,
    type: tool.type,
    title: pick(tool.title, locale),
    inputs: tool.inputs?.map((input) => ({
      id: input.id,
      label: pick(input.label, locale),
      unit: input.unit ? pick(input.unit, locale) : undefined,
      placeholder: input.placeholder ? pick(input.placeholder, locale) : undefined,
      defaultValue: input.defaultValue
    })),
    output: tool.output ? pick(tool.output, locale) : undefined,
    templateText: tool.templateText ? pick(tool.templateText, locale) : undefined
  })),
  faq: seed.faq.map((item) => ({
    q: pick(item.q, locale),
    a: pick(item.a, locale)
  }))
});

export function getAcademyCategories(locale: Locale): Category[] {
  return categories.map((category) => ({
    id: category.id,
    title: pick(category.title, locale),
    desc: pick(category.desc, locale),
    icon: category.icon
  }));
}

export function getAcademyLessons(locale: Locale): Lesson[] {
  return lessons.map((lesson) => mapLesson(lesson, locale));
}

export function getAcademyLessonsByCategory(locale: Locale, categoryId: string): Lesson[] {
  return getAcademyLessons(locale).filter((lesson) => lesson.categoryId === categoryId);
}

export function getLessonBySlug(locale: Locale, categoryId: string, slug: string): Lesson | null {
  return getAcademyLessons(locale).find((lesson) => lesson.categoryId === categoryId && lesson.slug === slug) ?? null;
}

export function getAllCategoryIds() {
  return categories.map((category) => category.id);
}

export function getAllLessonParams() {
  return lessons.map((lesson) => ({ category: lesson.categoryId, slug: lesson.slug }));
}

