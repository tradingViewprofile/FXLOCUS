"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

import { AcademyTable } from "@/components/academy/AcademyTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Category, Lesson, LessonToolOutput, LessonToolTable } from "@/lib/academy/types";

type Props = {
  locale: "zh" | "en";
  lesson: Lesson;
  category: Category;
};

type ProgressEntry = {
  checklist: Record<string, boolean>;
  lastSeen: string;
};

const PROGRESS_KEY = "academy.progress.v1";
const PLAN_KEY = "academy.plan.v1";
const FAVORITE_KEY = "academy.favorites.v1";
const DOWNLOAD_COOLDOWN_MS = 1200;

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function isTableOutput(output?: LessonToolOutput): output is LessonToolTable {
  return Boolean(output && typeof output === "object" && "columns" in output);
}

function buildContentBlocks(content: string) {
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks: { type: "p" | "ul"; items: string[] }[] = [];

  lines.forEach((line) => {
    if (line.startsWith("- ")) {
      const item = line.replace(/^- /, "");
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") {
        last.items.push(item);
      } else {
        blocks.push({ type: "ul", items: [item] });
      }
    } else {
      blocks.push({ type: "p", items: [line] });
    }
  });

  return blocks;
}

function renderContent(content: string) {
  return buildContentBlocks(content).map((block, idx) => {
    if (block.type === "ul") {
      return (
        <ul key={`ul-${idx}`} className="academy-list">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={`p-${idx}`} className="text-sm leading-6 text-slate-200/75">
        {block.items[0]}
      </p>
    );
  });
}

function sanitizeFileName(name: string) {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTemplateFileName(locale: "zh" | "en", lesson: Lesson) {
  const base = sanitizeFileName(lesson.title || lesson.slug || "template");
  const suffix = locale === "zh" ? "模板" : "template";
  const joiner = locale === "zh" ? "-" : "-";
  return `${base}${joiner}${suffix}.txt`;
}

function scrollToId(id: string) {
  if (typeof window === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
}

function useActiveAnchor(ids: string[]) {
  const [active, setActive] = React.useState(ids[0] ?? "");

  React.useEffect(() => {
    if (!ids.length) return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.2, 0.6, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export function LessonPageClient({ locale, lesson, category }: Props) {
  const ui =
    locale === "zh"
      ? {
          back: "返回学院",
          tldr: "TL;DR",
          start: "开始训练",
          plan: "加入学习计划",
          favorite: "收藏",
          favorited: "已收藏",
          guide: "指南",
          checklist: "清单",
          cases: "案例",
          tools: "工具",
          faq: "FAQ",
          meta: {
            readTime: "阅读时间",
            level: "难度",
            updated: "更新时间",
            audience: "适用人群",
            how: "怎么用",
            next: "下一步"
          },
          action: {
            progress: "本课进度",
            checklist: "Checklist完成度",
            params: "关键参数",
            download: "下载模板",
            downloaded: "已开始下载",
            throttled: "操作太快，请稍候",
            noTemplate: "暂无模板",
            saved: "已加入计划",
            remove: "移出计划"
          },
          expand: "展开细节",
          collapse: "收起细节",
          noParams: "本课暂无参数。",
          calculator: "计算结果",
          template: "模板"
        }
      : {
          back: "Back to academy",
          tldr: "TL;DR",
          start: "Start training",
          plan: "Add to plan",
          favorite: "Favorite",
          favorited: "Favorited",
          guide: "Guide",
          checklist: "Checklist",
          cases: "Cases",
          tools: "Tools",
          faq: "FAQ",
          meta: {
            readTime: "Read time",
            level: "Level",
            updated: "Updated",
            audience: "For",
            how: "How",
            next: "Next step"
          },
          action: {
            progress: "Lesson progress",
            checklist: "Checklist completion",
            params: "Key parameters",
            download: "Download template",
            downloaded: "Download started",
            throttled: "Too fast, please wait",
            noTemplate: "No template available",
            saved: "Saved to plan",
            remove: "Remove from plan"
          },
          expand: "Expand details",
          collapse: "Collapse details",
          noParams: "No parameters for this lesson.",
          calculator: "Calculator output",
          template: "Template"
        };

  const audienceSummary = lesson.sections.find((section) => section.id === "when-to-use")?.summary ?? "";
  const howSummary = lesson.sections.find((section) => section.id === "step-by-step")?.summary ?? "";

  const guideSections = lesson.toc
    .map((id) => lesson.sections.find((section) => section.id === id))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const anchorItems = [
    ...guideSections.map((section) => ({ id: section.id, title: section.title })),
    { id: "checklist", title: ui.checklist },
    { id: "cases", title: ui.cases },
    { id: "tools", title: ui.tools },
    { id: "faq", title: ui.faq }
  ];

  const activeAnchor = useActiveAnchor(anchorItems.map((item) => item.id));

  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
  const [planIds, setPlanIds] = React.useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>([]);
  const [downloadBusy, setDownloadBusy] = React.useState(false);
  const [downloadNotice, setDownloadNotice] = React.useState<string | null>(null);
  const downloadNoticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const progressStore = readStore<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
    const entry = progressStore[lesson.id];
    const defaultChecklist = lesson.checklistItems.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = entry?.checklist?.[item.id] ?? item.doneByDefault ?? false;
      return acc;
    }, {});
    setChecklist(defaultChecklist);
    progressStore[lesson.id] = {
      checklist: defaultChecklist,
      lastSeen: new Date().toISOString()
    };
    writeStore(PROGRESS_KEY, progressStore);

    setPlanIds(readStore<string[]>(PLAN_KEY, []));
    setFavoriteIds(readStore<string[]>(FAVORITE_KEY, []));
  }, [lesson]);

  React.useEffect(() => {
    return () => {
      if (downloadNoticeTimerRef.current) {
        clearTimeout(downloadNoticeTimerRef.current);
        downloadNoticeTimerRef.current = null;
      }
    };
  }, []);

  const totalChecklist = lesson.checklistItems.length || 1;
  const completedChecklist = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedChecklist / totalChecklist) * 100);

  const updateChecklist = (id: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const progressStore = readStore<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
      progressStore[lesson.id] = {
        checklist: next,
        lastSeen: new Date().toISOString()
      };
      writeStore(PROGRESS_KEY, progressStore);
      return next;
    });
  };

  const togglePlan = () => {
    setPlanIds((prev) => {
      const next = prev.includes(lesson.id) ? prev.filter((id) => id !== lesson.id) : [...prev, lesson.id];
      writeStore(PLAN_KEY, next);
      return next;
    });
  };

  const toggleFavorite = () => {
    setFavoriteIds((prev) => {
      const next = prev.includes(lesson.id) ? prev.filter((id) => id !== lesson.id) : [...prev, lesson.id];
      writeStore(FAVORITE_KEY, next);
      return next;
    });
  };

  const templateTool = lesson.tools.find((tool) => tool.templateText);
  const paramTool = lesson.tools.find((tool) => tool.type === "params");

  const downloadTemplate = () => {
    if (downloadBusy) {
      setDownloadNotice(ui.action.throttled);
      return;
    }
    if (!templateTool?.templateText) {
      setDownloadNotice(ui.action.noTemplate);
      return;
    }
    if (typeof window === "undefined") return;
    setDownloadBusy(true);
    setDownloadNotice(ui.action.downloaded);
    if (downloadNoticeTimerRef.current) {
      clearTimeout(downloadNoticeTimerRef.current);
    }
    downloadNoticeTimerRef.current = setTimeout(() => {
      setDownloadBusy(false);
      setDownloadNotice(null);
    }, DOWNLOAD_COOLDOWN_MS);
    const blob = new Blob([templateTool.templateText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildTemplateFileName(locale, lesson);
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="fx-section pb-6">
        <div className="flex items-center gap-3 text-xs text-slate-200/60">
          <Link
            href={`/academy/${category.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200/70 transition hover:border-sky-400/40 hover:bg-white/10 hover:text-slate-50"
            aria-label={ui.back}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{ui.back}</span>
          </Link>
          <span className="text-[11px] font-semibold tracking-[0.16em] text-slate-200/50">
            {locale === "zh" ? "学院" : "Academy"}
          </span>
          <span className="text-slate-200/40">/</span>
          <span className="text-slate-200/80">{category.title}</span>
        </div>
        <div className="academy-eyebrow">{category.title}</div>
        <h1 className="academy-h1 mt-4">{lesson.title}</h1>
        <p className="academy-lead">{lesson.subtitle}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200/70">
          <span>{ui.meta.readTime}: {lesson.readTime}</span>
          <span>·</span>
          <span>{ui.meta.level}: {lesson.level}</span>
          <span>·</span>
          <span>{ui.meta.updated}: {lesson.updatedAt}</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card className="academy-card p-4">
            <div className="text-xs font-semibold text-slate-200/60">{ui.meta.audience}</div>
            <div className="mt-2 text-sm text-slate-100">{audienceSummary || lesson.summary}</div>
          </Card>
          <Card className="academy-card p-4">
            <div className="text-xs font-semibold text-slate-200/60">{ui.meta.how}</div>
            <div className="mt-2 text-sm text-slate-100">{howSummary || lesson.summary}</div>
          </Card>
          <Card className="academy-card p-4">
            <div className="text-xs font-semibold text-slate-200/60">{ui.meta.next}</div>
            <div className="mt-2 text-sm text-slate-100">{ui.start}</div>
            <button type="button" className="mt-3 text-xs text-sky-300" onClick={() => scrollToId("checklist")}>
              {ui.start} →
            </button>
          </Card>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card className="academy-card p-5">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">{ui.tldr}</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200/75">
              {lesson.tldr.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="academy-card p-5">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">{ui.meta.audience}</div>
            <p className="mt-3 text-sm leading-6 text-slate-200/75">{lesson.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {lesson.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} className="text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => scrollToId("checklist")}>{ui.start}</Button>
          <Button variant="secondary" onClick={togglePlan}>
            {planIds.includes(lesson.id) ? ui.action.remove : ui.plan}
          </Button>
          <Button variant="secondary" onClick={toggleFavorite}>
            {favoriteIds.includes(lesson.id) ? ui.favorited : ui.favorite}
          </Button>
        </div>
      </section>

      <section className="fx-section pt-0">
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_300px]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="academy-card p-4">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">ToC</div>
              <nav className="mt-4 space-y-2 text-sm">
                {anchorItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToId(item.id)}
                    className={[
                      "academy-toc-item",
                      activeAnchor === item.id ? "academy-toc-active" : ""
                    ].join(" ")}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          <main className="space-y-8">
            <div className="academy-tab-row">
              {[ui.guide, ui.checklist, ui.cases, ui.tools, ui.faq].map((tab, idx) => {
                const ids = ["guide", "checklist", "cases", "tools", "faq"];
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => scrollToId(ids[idx])}
                    className="academy-tab"
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <section id="guide" className="space-y-3">
              {guideSections.map((section) => (
                <Card key={section.id} id={section.id} className="academy-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="academy-h2">{section.title}</h2>
                    <Badge className="text-[11px]">{ui.guide}</Badge>
                  </div>
                  <p className="academy-clamp-3 mt-3 text-sm leading-6 text-slate-200/70">
                    {section.summary}
                  </p>
                  <details className="academy-details mt-4">
                    <summary className="academy-summary">{ui.expand}</summary>
                    <div className="academy-detail-body">
                      {renderContent(section.content)}
                      {section.accordions.length ? (
                        <div className="mt-3 space-y-2">
                          {section.accordions.map((accordion) => (
                            <details key={accordion.id} className="academy-accordion">
                              <summary className="academy-summary">{accordion.title}</summary>
                              <div className="academy-detail-body">{renderContent(accordion.content)}</div>
                            </details>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </details>
                </Card>
              ))}
            </section>

            <section id="checklist" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="academy-h2">{ui.checklist}</h2>
                <span className="text-xs text-slate-200/60">
                  {completedChecklist}/{totalChecklist}
                </span>
              </div>
              <Card className="academy-card p-5">
                <div className="space-y-3">
                  {lesson.checklistItems.map((item) => (
                    <label key={item.id} className="academy-check-item">
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item.id])}
                        onChange={() => updateChecklist(item.id)}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-50">{item.text}</div>
                        <div className="text-xs text-slate-200/60">{item.why}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>
            </section>

            <section id="cases" className="space-y-3">
              <h2 className="academy-h2">{ui.cases}</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {lesson.cases.map((caseItem) => (
                  <Card key={caseItem.id} className="academy-card p-5">
                    <div className="text-sm font-semibold text-slate-50">{caseItem.title}</div>
                    <div className="mt-2 space-y-2 text-xs text-slate-200/70">
                      <div><span className="text-slate-200/50">Setup:</span> {caseItem.setup}</div>
                      <div><span className="text-slate-200/50">Execution:</span> {caseItem.execution}</div>
                      <div><span className="text-slate-200/50">Result:</span> {caseItem.result}</div>
                      <div><span className="text-slate-200/50">Review:</span> {caseItem.review}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            <section id="tools" className="space-y-3">
              <h2 className="academy-h2">{ui.tools}</h2>
              <div className="space-y-3">
                {lesson.tools.map((tool) => {
                  if (tool.type === "table" && isTableOutput(tool.output)) {
                    return (
                      <Card key={tool.id} className="academy-card p-5">
                        <div className="text-sm font-semibold text-slate-50">{tool.title}</div>
                        <div className="mt-4">
                          <AcademyTable data={tool.output} />
                        </div>
                      </Card>
                    );
                  }

                  if (tool.type === "template" && tool.templateText) {
                    return (
                      <Card key={tool.id} className="academy-card p-5">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-50">{tool.title}</div>
                          <Badge className="text-[11px]">{ui.template}</Badge>
                        </div>
                        <textarea
                          readOnly
                          value={tool.templateText}
                          className="academy-textarea mt-3"
                          rows={6}
                        />
                      </Card>
                    );
                  }

                  if (tool.type === "calculator" && tool.inputs) {
                    return (
                      <CalculatorTool key={tool.id} tool={tool} locale={locale} />
                    );
                  }

                  if (tool.inputs) {
                    return (
                      <Card key={tool.id} className="academy-card p-5">
                        <div className="text-sm font-semibold text-slate-50">{tool.title}</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {tool.inputs.map((input) => (
                            <div key={input.id} className="academy-param">
                              <div className="text-xs text-slate-200/60">{input.label}</div>
                              <div className="mt-1 text-sm text-slate-50">
                                {input.defaultValue ?? input.placeholder ?? "--"}
                                {input.unit ? <span className="text-xs text-slate-200/50"> {input.unit}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card key={tool.id} className="academy-card p-5">
                      <div className="text-sm font-semibold text-slate-50">{tool.title}</div>
                      <p className="mt-3 text-sm text-slate-200/70">{tool.output as string}</p>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section id="faq" className="space-y-3">
              <h2 className="academy-h2">{ui.faq}</h2>
              <Card className="academy-card p-5">
                <div className="space-y-3">
                  {lesson.faq.map((item, idx) => (
                    <details key={`${item.q}-${idx}`} className="academy-accordion">
                      <summary className="academy-summary">{item.q}</summary>
                      <div className="academy-detail-body">
                        <p className="text-sm leading-6 text-slate-200/70">{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </Card>
            </section>
          </main>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="academy-card p-5">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {ui.action.progress}
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-50">{progressPercent}%</div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-sky-400/80" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-4 text-xs text-slate-200/60">
                {ui.action.checklist}: {completedChecklist}/{totalChecklist}
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                  {ui.action.params}
                </div>
                <div className="mt-2 space-y-2 text-xs text-slate-200/70">
                  {paramTool?.inputs?.length ? (
                    paramTool.inputs.slice(0, 3).map((input) => (
                      <div key={input.id} className="flex items-center justify-between">
                        <span>{input.label}</span>
                        <span className="text-slate-50">
                          {input.defaultValue ?? input.placeholder ?? "--"}
                          {input.unit ? <span className="text-slate-200/50"> {input.unit}</span> : null}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>{ui.noParams}</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={() => scrollToId("checklist")}>{ui.start}</Button>
                <Button variant="secondary" onClick={togglePlan}>
                  {planIds.includes(lesson.id) ? ui.action.saved : ui.plan}
                </Button>
                <Button
                  variant="secondary"
                  onClick={downloadTemplate}
                  disabled={!templateTool?.templateText || downloadBusy}
                >
                  {ui.action.download}
                </Button>
              </div>
              {downloadNotice ? (
                <div className="mt-3 text-xs text-slate-200/60" aria-live="polite">
                  {downloadNotice}
                </div>
              ) : null}
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}

function CalculatorTool({ tool, locale }: { tool: Lesson["tools"][number]; locale: "zh" | "en" }) {
  const [values, setValues] = React.useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    tool.inputs?.forEach((input) => {
      next[input.id] = input.defaultValue ?? 0;
    });
    return next;
  });

  const account = values["account-size"] ?? 0;
  const riskPercent = values["risk-percent"] ?? 0;
  const stopDistance = values["stop-distance"] ?? 0;
  const riskAmount = account * (riskPercent / 100);
  const size = stopDistance > 0 ? riskAmount / stopDistance : 0;

  return (
    <Card className="academy-card p-5">
      <div className="text-sm font-semibold text-slate-50">{tool.title}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {tool.inputs?.map((input) => (
          <label key={input.id} className="academy-input-group">
            <span className="text-xs text-slate-200/60">{input.label}</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                value={values[input.id] ?? 0}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [input.id]: Number(event.target.value) }))
                }
                className="academy-input"
              />
              {input.unit ? <span className="text-xs text-slate-200/60">{input.unit}</span> : null}
            </div>
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold text-slate-200/60">
          {locale === "zh" ? "计算结果" : "Result"}
        </div>
        <div className="mt-2 text-sm text-slate-50">
          {locale === "zh" ? "建议仓位" : "Suggested size"}: {size.toFixed(2)}
        </div>
        {tool.output ? (
          <div className="mt-2 text-xs text-slate-200/60">{tool.output as string}</div>
        ) : null}
      </div>
    </Card>
  );
}
