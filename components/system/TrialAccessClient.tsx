"use client";

import React from "react";
import { useRouter } from "next/navigation";

type LetterSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
};

const LETTER_SECTIONS: LetterSection[] = [
  {
    title: "筛选",
    paragraphs: [
      "一部分人有这样的特性：他们急躁，不知道自己想要什么，看问题只浮于表面，无法看透事物的本质，或者压根不适合做交易员这个工作，适合做那些“稳定”的“当一天和尚敲一天钟”的工作。",
      "关于收入、社保、底薪、薪资结构等问题，我在这里再次阐述：任何盈利组织企业一定不会做亏本的事情（至少他们认为的）。就算是高薪招一个什么都不会的应届生，也是因为政府的补贴，或此应届生已经足够优秀，证明了自己的能力。公司能看到他未来可能产生的价值。",
      "所以，你通过工作得到的收入一定小于你创造的价值。在这个极简的行业，你创造的价值明码标价——通过在二级市场买卖差价，为团队获取报酬。",
      "在你证明自己有盈利能力（通过考核）前，我们绝对不会投入任何金钱（当然，时间精力也只会投向看起来更有希望的候选人）。如果想拿着过去的成就扔我脸上往这里一坐，伸出手来：给钱。抱歉，这不适合你，可以去试试传统的大公司，他们也许认可这些东西。",
      "关于通过考核后的收入、薪资结构、社保等问题。其实你明白，在你证明自己有生产力之前是没必要问这些问题的，你只需明白一点，你的实际收入一定不会超过你在战场（二级市场）上缴获的物资。问这个问题只不过是担心我们跑路，那么请问：如果你已经是一名能稳定带回战果的士兵了，我们会跑路吗？央行会扔掉他们的印钞机吗？",
      "说回这些问题，这些问题我能回答吗？当然能，答案也很简单，但我依然不会回答这些问题。这也是筛选的一环。如果你多疑，看问题只看表面，或上面这段话看不懂，那么你其实不适合做这一行，360 行都可出状元，天生你材必有他用。"
    ]
  },
  {
    title: "第一面",
    list: [
      "首先我们的行业性质不属于业务、市场范畴，如果你本人性格特别外向、过于跳跃、不擅长遵守纪律、没有严格执行力，可能并不适合本职位。",
      "区域性小团队化办公或远程办公作业是我们的行业特性。需要严格筛选及一定周期的培训、考核，并最终自主选择薪金模式。如果你对该行业不太了解，建议你多查询相关资料后再进一步沟通（对行业不太了解可以去百度搜索“伯克希尔有多少员工”之类信息熟悉）。",
      "同样由于行业特性，我们本质在做的就是淘金。是在做千、万里挑一的工作。由于区域范围广泛以及个体差异，我们将采用：弹性工作机制、差异性业绩薪金考核方式/标准等要求，你可以自主选择是否接受。",
      "无论在沟通、面试、培训、工作中，都绝不允许任何一方出现“索要资金”“变相入金”“要求拉业务”“拉资金、融资、变相融资”等任何违法违规的行为……所有职位一切仅限于技术、数据、管理等范畴，一旦出现该情况，请第一时间告知。",
      "回答典型问题：有人问一些为什么我们要求“交易员”年龄（认为年轻人“不牢靠”“没经验”）。在多数国人的眼中，甚至不乏众多金融从业者，很多都认为，有过很多年交易经验或曾在银行、券商、公私募等金融机构工作过的才是所谓的“专家”，才会交易、能赚钱，才有资格做交易员（操盘手）。请你千万不要这样理解，更不要用“老中医才是高手”“老会计才专业”“老管理人才有水平”这种行业思维死搬硬套……因为这是大错特错、完全误解的。（这些在其他行业似乎正确的规律，起码在本行业完全不适用。国内 90% 的“年龄大、经验广的”老油条根本上是交易的失败者（很多坏习惯）或上不去下不来的“江湖游魂（掩耳盗铃/到处募资……）”，这一点，他们自己心里最明白，原谅我找不到更贴切的方式形容）。真正答案是：这个行业（职业）是真正属于 18-30 岁的“适合”的年轻人。",
      "为了不浪费彼此的时间，我们会用最短的时间（5～20 个工作日），筛选/训练“适合的年轻人”达到他们（所谓专家）10～20 年的“盈利能力”，并科学规避他们身上不应该有的错误定式思维、复杂糟粕及恶习。这一点也不奇怪，“一张白纸最好画”，难道不是吗？目前职业交易员的职业化训练在国内一直（近 30 年）是相对荒芜的。那些所谓的年龄经验丰富者，多数是自学一招半式或夹杂自创的“土办法”“障眼法”。而我们这里是交易员的“黄埔军校”。总之，如果适合做 Trader（这个职业）入行越年轻越好！我们的原则是，在最短的周期（5～20 个交易日培训后）判别该年轻人是否适合该行业，认为不适合者会忠告其终身不要再踏足这个行业，毕竟“赌徒（比喻）”只适合极少数人。",
      "相信多数人还有类似更多问题，要通过时间慢慢了解、理解（奉劝所有的年轻人不要着急，心态放平，给自己一次机会试试就好，发现不适合自己的不要执着，即刻离开，天生你材必有他用。另外，特别在此重申仔细看上面第 4 条，无论你到任何公司，不要入金、不要融资、不要参与拉业务……以规避不必要的风险。",
      "最后，统一说明一下很多人关心的工作内容问题，一切的工作只有一件事：Trading（交易，并取得利润）。简单说就两个动作，把钱推进去，之后把钱拿出来。既没有传统行业的进存销，也没有原材料、加工、推广等环节，更没有传统所谓的天花板和边际以及工商税务等行政环节。是一个极简行业，极简意味着极纯粹，意味着容不得半句谎言（包括对自己）。唯一要做的就是让自己成为优秀的 Trader。"
    ]
  },
  {
    title: "第二面",
    list: [
      "好的开始：你因为好奇心，和不怕被骗的勇气，从其他渠道了解到我们后，你加了微信，于是你穿过滤网到了这里。在今后的职业生涯中这样的滤网还有很多。保持你的好奇心 + 勇气，这二者催生出运气，这是成功的钥匙之一。",
      "重新详述一下这个职业（交易员）：这个职业在本质上是简单明了的，是一个黑白分明、胜负分明、成败分明的领域，它不容模糊。简而言之，想象一下你被派往战场，通过击败敌人并从他们身上夺取徽章（或臂章）来赚取奖金（金钱）。当然，如果你在战场上缺乏良好的技能和纪律，你也可能会被击败。这听起来很像雇佣兵的工作方式：根据你的努力获得相应的报酬。现在你应该明确些了，实际上，你的所有收入都源自于你个人所创造的生产力，即亲自播种、施肥和收获的成果，而不是那些模糊不清、需要团队合作且难以明确各自贡献的工作。因此，你不必担心与他人争论功劳大小或分配收益的问题。然而，你必须将每天（或每周、每月）将通过生产力创造剩余价值中的一部分，分配给你的上级比如团队长或基金经理。这种做法与资本的运作方式相符：他们通过辛勤训练和指导你，目的是为了能够“分享”（或者按照某些观点，可以说是“榨取”）你的剩余价值。当然，上述内容在所有行业中均是适用的，只不过这个过程在其他行业中被有意无意的巧妙隐藏了，而这个行业的核心是诚实，所以这个过程在这里显得过于露骨。",
      "重新详述一下这个职业的定位：团队长的职责是将你从一个对系统不熟悉的新手（小白）培养成一个高效的士兵（印钞机），随后持续地从你的工作成果中获取剩余价值。你的工作成果则是从你在市场（战场）中凭借个人勇气和能力所获得的收益，而这个战场上有如恒河中所有沙数一样多的财富，有本事可以随时取随遍取。你可以把自己理解为：杀手、雇佣兵、冲浪者、强盗、赌徒……等等需要独立思考、勇敢面对挑战的孤勇者。",
      "职业阶梯：交易员（士兵）：在 20 个工作日期间认真接受密集训练，争取迅速成长为一名战士。在此期间如果你穿过了重重筛网，通过考核证明了自己，你将正式加入团队，开始你的交易员生涯，并享受一段被榨取利益（与团队长收益分成）的时光。当然，那个时候你肯定已经不关心钱了，反正没有任何行业的“员”的职位收入能超过交易员。团队长（军官）：在前线拼杀过一段时间后，若你感兴趣，你将可以尝试组建团队，你将训练新兵，给他们讲述你在战场上的故事，此时你便成了“军官”。上战场不是你的任务了，你将为他们分配资金和策略，在指挥所里喝茶、监视、榨取团队的剩余价值，此时你就已经“财务自由”了。基金经理（统帅）：当你带出来的新兵成长为团队长，就像树木长出枝丫，你拥有了多个团队，此时你便可以成立自己的私募基金，并规模化管理多种衍生品。团队长已经“财务自由”，何况拥有多个团队的基金经理，此时你已经是半退休的状态，并且拥有永续不断的被动收入。",
      "总结：7～20 个工作日就能看清楚你是否有缘和我们一起战斗，或者说有能力胜任这个职位。最终只会有以下结局：结局 1：如果你不适合这行（无法从大海里舀水），你会在 20 个工作日内主动离开（或让你被动离开）。结局 2：你恰好适合，通过了考验。上述职业阶梯将为你开始，命运的齿轮也开始转动。根据以往的经验，统计下来结局 2 的比例小于 18%，但对于你个人来说，概率是 1% 或 90%，你是否愿意“赌”一把。有人问：“培训期间给钱吗？”，答案是不会。但是显然你明白的，本行业不适合这么问。因为，不久的未来你能体会，摆在面前的不是一份普通应聘工作，而是一次人生道路的抉择！对于职业交易员来说，无论哪个结果，“几天的培训补助”，都不应该是你看中的。另外，不可能给每个不确定适合者发钱，毕竟这个行业职位不一定适合每个人，在此再次强调：选择权在双方。如果你看到了这里，祝贺你，初步的筛选已经完成。",
      "最后多说一句：你应该清楚，你面临的最大风险就是在训练期间被淘汰，而你的成本是时间（当然这取决于你如何看待这 20 天的培训，是否认真对待，是否问心无愧）。万物皆交易，人生需负熵。未来已来，只是分布不均。"
    ]
  }
];

const FLOW_LINE = "进入系统——面试预约——提交报名表——审核通过，正式进入训练";

export function TrialAccessClient({
  locale,
  mode
}: {
  locale: "zh" | "en";
  mode: "main" | "confirm";
}) {
  const router = useRouter();
  const [eligible, setEligible] = React.useState<boolean | null>(null);
  const t = React.useCallback((zh: string, en: string) => (locale === "zh" ? zh : en), [locale]);

  React.useEffect(() => {
    if (mode !== "main") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/trial-access/status", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) {
          setEligible(false);
          return;
        }
        setEligible(Boolean(json.eligible));
      } catch {
        if (!alive) return;
        setEligible(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode]);

  if (mode === "main" && eligible === null) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
        {t("加载中...", "Loading...")}
      </div>
    );
  }

  if (mode === "main" && eligible === false) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
        <div className="text-lg text-white/90 font-semibold">
          {t("当前不符合三日体验条件", "Not eligible")}
        </div>
        <div className="mt-3 text-sm text-white/60">
          {t("如有疑问，请联系团队长或通过咨询沟通。", "Contact your leader or consult for help.")}
        </div>
        <button
          type="button"
          onClick={() => router.replace(`/${locale}/system/dashboard`)}
          className="mt-5 inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          {t("返回仪表盘", "Back to dashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === "main" ? (
        <>
          <section className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100/90">
            <div className="text-base font-semibold">你正在使用【3日体验账号】</div>
            <div className="mt-1 text-sm text-amber-100/80">本阶段仅用于了解流程与判断是否继续参与</div>
            <div className="mt-1 text-sm text-amber-100/70">未进行任何操作，账号将在到期后自动冻结</div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
            <header className="space-y-2">
              <div className="text-white/90 text-2xl font-semibold">三封信</div>
              <div className="text-white/70 text-sm">给未来交易员的三封信</div>
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                团队理念：重筛选，轻培养，不教育
              </div>
            </header>

            <div className="space-y-6">
              {LETTER_SECTIONS.map((section) => (
                <article key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-white/95 text-lg font-semibold tracking-tight">{section.title}</div>
                  <div className="mt-4 space-y-3 text-sm text-white/70 leading-7">
                    {section.paragraphs?.map((p, idx) => (
                      <p key={`${section.title}-p-${idx}`}>{p}</p>
                    ))}
                    {section.list ? (
                      <ol className="list-decimal pl-5 space-y-2">
                        {section.list.map((item, idx) => (
                          <li key={`${section.title}-li-${idx}`}>{item}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="text-white/90 text-xl font-semibold">流程确认</div>
            <div className="text-white/70 text-sm leading-7">{FLOW_LINE}</div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/system/trial-access/confirm`)}
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15"
            >
              确认流程
            </button>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="text-white/90 text-xl font-semibold">流程说明</div>
            <div className="text-white/70 text-sm leading-7">{FLOW_LINE}</div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="text-white/90 text-xl font-semibold">面试要求</div>
            <div className="text-white/70 text-sm leading-7">
              面试每日 11 点进行，需要提前一天向助教或团队长进行预约，请预先调试好自己的摄像头和麦克风。参与者请在等候区耐心等候，面试官会把你拉进会议室。本次面试共十分钟，请你预先准备好简单的自我介绍（不超过 3 分钟）。面试共三个环节：自我介绍、专业问答和自由提问。
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${locale}/system/consult`)}
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15"
            >
              我已了解流程：预约面试
            </button>
          </section>
        </>
      )}
    </div>
  );
}
