"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type ProgressStore = Record<string, { completedLessons: string[] }>;

const STORAGE_KEY = "fxlocus.courseProgress.v1";

function readStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressStore;
  } catch {
    return {};
  }
}

export function CourseProgressSummary({
  courseSlug,
  totalLessons
}: {
  courseSlug: string;
  totalLessons: number;
}) {
  const t = useTranslations("courses");
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const store = readStore();
    const completed = store[courseSlug]?.completedLessons ?? [];
    setCompletedCount(new Set(completed).size);
  }, [courseSlug]);

  const pct = useMemo(() => {
    if (!totalLessons) return 0;
    return Math.round((completedCount / totalLessons) * 100);
  }, [completedCount, totalLessons]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] font-semibold tracking-[0.16em] text-slate-200/60">
        {t("progress")}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <div className="text-sm font-semibold text-slate-50">
          {completedCount}/{totalLessons}
        </div>
        <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
          {pct}%
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-sky-400/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

