"use client";

import React from "react";

import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";

type UiLabels = {
  title: string;
  lead: string;
  toc: string;
  lessons: string;
  keyPoints: string;
  practice: string;
  pitfalls: string;
  quickCheck: string;
  disclaimerTitle: string;
  disclaimer: string;
};

type Lesson = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  practice?: string;
  pitfalls: string[];
  quickCheck: string[];
};

type Module = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  lessons: Lesson[];
};

function parseHash(hash: string) {
  const h = (hash || "").replace(/^#/, "").trim();
  if (!h) return null;
  const lessonMatch = h.match(/^lesson-(\d+)-(\d+)$/);
  if (lessonMatch) return { type: "lesson" as const, moduleIndex: Number(lessonMatch[1]) - 1, lessonIndex: Number(lessonMatch[2]) - 1 };
  const moduleMatch = h.match(/^module-(\d+)$/);
  if (moduleMatch) return { type: "module" as const, moduleIndex: Number(moduleMatch[1]) - 1 };
  return null;
}

function clampIndex(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  if (max <= 0) return 0;
  return Math.min(max - 1, Math.max(0, Math.trunc(value)));
}

export function AcademyWorkbench({
  locale,
  ui,
  modules
}: {
  locale: "zh" | "en";
  ui: UiLabels;
  modules: Module[];
}) {
  const [selectedModule, setSelectedModule] = React.useState(0);
  const [selectedLesson, setSelectedLesson] = React.useState(0);

  const moduleCount = modules.length;
  const activeModule = modules[clampIndex(selectedModule, moduleCount)];
  const lessonCount = activeModule?.lessons.length ?? 0;
  const activeLesson = activeModule?.lessons[clampIndex(selectedLesson, lessonCount)];

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseHash(window.location.hash);
    if (!parsed) return;
    if (parsed.type === "module") {
      const nextModule = clampIndex(parsed.moduleIndex, moduleCount);
      setSelectedModule(nextModule);
      setSelectedLesson(0);
      return;
    }
    if (parsed.type === "lesson") {
      const nextModule = clampIndex(parsed.moduleIndex, moduleCount);
      const nextLesson = clampIndex(parsed.lessonIndex, modules[nextModule]?.lessons.length ?? 0);
      setSelectedModule(nextModule);
      setSelectedLesson(nextLesson);
    }
  }, [moduleCount, modules]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeModule || !activeLesson) return;
    const nextHash = `#${activeLesson.id}`;
    if (window.location.hash === nextHash) return;
    window.history.replaceState(null, "", nextHash);
  }, [activeLesson, activeModule]);

  const goPrev = () => {
    if (!activeModule) return;
    if (selectedLesson > 0) {
      setSelectedLesson((v) => v - 1);
      return;
    }
    if (selectedModule > 0) {
      const nextModule = selectedModule - 1;
      const lastLesson = Math.max(0, (modules[nextModule]?.lessons.length ?? 1) - 1);
      setSelectedModule(nextModule);
      setSelectedLesson(lastLesson);
    }
  };

  const goNext = () => {
    if (!activeModule) return;
    if (selectedLesson < (activeModule.lessons.length ?? 1) - 1) {
      setSelectedLesson((v) => v + 1);
      return;
    }
    if (selectedModule < moduleCount - 1) {
      setSelectedModule((v) => v + 1);
      setSelectedLesson(0);
    }
  };

  const canPrev = selectedModule > 0 || selectedLesson > 0;
  const canNext =
    selectedModule < moduleCount - 1 || selectedLesson < ((activeModule?.lessons.length ?? 1) - 1);

  return (
    <section className="fx-section">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">{ui.toc}</div>
            <div className="mt-3 text-sm leading-6 text-slate-200/70">{ui.lead}</div>

            <div className="mt-5 space-y-2">
              {modules.map((m, idx) => {
                const isActive = idx === selectedModule;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedModule(idx);
                      setSelectedLesson(0);
                    }}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-sky-400/30 bg-sky-500/10"
                        : "border-white/10 bg-white/5 hover:border-sky-400/25"
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-50">{m.title}</div>
                        <div className="mt-1 text-xs text-slate-200/55">
                          {ui.lessons} {m.lessons.length}
                        </div>
                      </div>
                      <span className="fx-pill text-slate-100/70">{String(m.index).padStart(2, "0")}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeModule ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                  {activeModule.title}
                </div>
                <div className="mt-3 space-y-1">
                  {activeModule.lessons.map((lesson, idx) => {
                    const isActive = idx === selectedLesson;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setSelectedLesson(idx)}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                          isActive
                            ? "border-sky-400/30 bg-sky-500/10 text-slate-50"
                            : "border-white/10 bg-white/5 text-slate-200/70 hover:border-sky-400/25"
                        ].join(" ")}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span className="line-clamp-1">{lesson.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0">
          <Card className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">{ui.title}</div>
                {activeModule ? (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="fx-pill text-slate-100/80">{String(activeModule.index).padStart(2, "0")}</span>
                      <h2 className="text-2xl font-semibold text-slate-50">{activeModule.title}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200/70">{activeModule.subtitle}</p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200/70">
                  {activeModule ? `${activeModule.index}/${moduleCount}` : `0/${moduleCount}`}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200/70">
                  {activeLesson ? `${selectedLesson + 1}/${lessonCount}` : `0/${lessonCount}`}
                </span>
              </div>
            </div>

            {activeLesson ? (
              <div className="mt-7 space-y-6">
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                    {locale === "en" ? "Overview" : "概览"}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-50">{activeLesson.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200/70">{activeLesson.summary}</p>
                </div>

                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                    {locale === "en" ? "Status" : "状态"}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-200/60">{ui.lessons}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{lessonCount}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-200/60">{locale === "en" ? "Module" : "模块"}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">
                        {activeModule.index}/{moduleCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-200/60">{locale === "en" ? "Lesson" : "主题"}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">
                        {selectedLesson + 1}/{lessonCount}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                    {locale === "en" ? "Actions" : "操作"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!canPrev}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100/80 hover:border-sky-400/30 hover:bg-sky-500/10 disabled:opacity-40"
                    >
                      {locale === "en" ? "Previous" : "上一主题"}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canNext}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100/80 hover:border-sky-400/30 hover:bg-sky-500/10 disabled:opacity-40"
                    >
                      {locale === "en" ? "Next" : "下一主题"}
                    </button>
                    <Link
                      href="/framework"
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100/80 hover:border-sky-400/30 hover:bg-sky-500/10"
                    >
                      {locale === "en" ? "View framework" : "查看框架"}
                    </Link>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">
                    {locale === "en" ? "Details" : "细节"}
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">{ui.keyPoints}</div>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200/75">
                        {activeLesson.points.map((point) => (
                          <li key={`${activeLesson.id}-${point}`} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
                        <div className="text-xs font-semibold tracking-[0.16em] text-emerald-100/80">{ui.practice}</div>
                        <div className="mt-2 text-sm leading-6 text-emerald-100/75">
                          {activeLesson.practice ??
                            (locale === "en"
                              ? "Practice: summarize the topic and create one checklist you can execute."
                              : "练习：用一句话总结主题，并写出你能执行的检查清单。")}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5">
                        <div className="text-xs font-semibold tracking-[0.16em] text-rose-100/80">{ui.pitfalls}</div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-rose-100/75">
                          {activeLesson.pitfalls.map((p) => (
                            <li key={`${activeLesson.id}-pit-${p}`} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300/80" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">{ui.quickCheck}</div>
                    <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-200/75">
                      {activeLesson.quickCheck.map((q) => (
                        <li key={`${activeLesson.id}-q-${q}`} className="flex gap-2">
                          <span className="mt-1.5 text-slate-200/50">{String.fromCharCode(8226)}</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <details className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <summary className="cursor-pointer list-none text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {ui.disclaimerTitle}
                  </summary>
                  <div className="mt-3 text-sm leading-6 text-slate-200/70">{ui.disclaimer}</div>
                </details>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}
