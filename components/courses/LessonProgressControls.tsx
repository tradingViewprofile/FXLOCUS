"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, ButtonLink } from "@/components/ui/Button";

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

function writeStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function LessonProgressControls({
  courseSlug,
  lessonSlug,
  prevHref,
  nextHref
}: {
  courseSlug: string;
  lessonSlug: string;
  prevHref?: string;
  nextHref?: string;
}) {
  const t = useTranslations("courses");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const store = readStore();
    const completedLessons = new Set(store[courseSlug]?.completedLessons ?? []);
    setCompleted(completedLessons.has(lessonSlug));
  }, [courseSlug, lessonSlug]);

  const toggle = useCallback(() => {
    const store = readStore();
    const next = { ...store };
    const current = new Set(next[courseSlug]?.completedLessons ?? []);
    if (current.has(lessonSlug)) current.delete(lessonSlug);
    else current.add(lessonSlug);
    next[courseSlug] = { completedLessons: [...current] };
    writeStore(next);
    setCompleted(current.has(lessonSlug));
  }, [courseSlug, lessonSlug]);

  const statusLabel = completed ? t("completed") : t("notCompleted");

  const nav = useMemo(() => {
    const items: Array<{ href: string; label: string; variant: "secondary" | "primary" }> = [];
    if (prevHref) items.push({ href: prevHref, label: t("prevLesson"), variant: "secondary" });
    if (nextHref) items.push({ href: nextHref, label: t("nextLesson"), variant: "primary" });
    return items;
  }, [nextHref, prevHref, t]);

  return (
    <div className="fx-card p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
            {t("progress")}
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-50">{statusLabel}</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant={completed ? "secondary" : "primary"}
            className="rounded-full px-5 py-2 text-sm"
            onClick={toggle}
          >
            {completed ? t("markIncomplete") : t("markComplete")}
          </Button>
          {nav.map((item) => (
            <ButtonLink
              key={item.href}
              href={item.href}
              variant={item.variant}
              className="rounded-full px-5 py-2 text-sm"
            >
              {item.label}
            </ButtonLink>
          ))}
        </div>
      </div>
    </div>
  );
}
