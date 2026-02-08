"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

import { LessonCard } from "@/components/academy/LessonCard";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Category, Lesson } from "@/lib/academy/types";

type Props = {
  locale: "zh" | "en";
  category: Category;
  lessons: Lesson[];
};

function parseReadTime(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function AcademyCategory({ locale, category, lessons }: Props) {
  const ui = React.useMemo(
    () =>
      locale === "zh"
        ? {
            filter: "筛选",
            tag: "标签",
            level: "难度",
            time: "阅读时间",
            updated: "更新时间",
            all: "全部",
            back: "返回学院",
            start: "开始学习",
            timeOptions: ["10分钟内", "10-20分钟", "20分钟以上"]
          }
        : {
            filter: "Filter",
            tag: "Tags",
            level: "Level",
            time: "Read time",
            updated: "Updated",
            all: "All",
            back: "Back to academy",
            start: "Start learning",
            timeOptions: ["Under 10 min", "10-20 min", "Over 20 min"]
          },
    [locale]
  );

  const tags = React.useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((lesson) => lesson.tags.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [lessons]);

  const levels = React.useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((lesson) => set.add(lesson.level));
    return Array.from(set);
  }, [lessons]);

  const updates = React.useMemo(() => {
    const set = new Set<string>();
    lessons.forEach((lesson) => set.add(lesson.updatedAt));
    return Array.from(set);
  }, [lessons]);

  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [level, setLevel] = React.useState(ui.all);
  const [time, setTime] = React.useState(ui.all);
  const [updated, setUpdated] = React.useState(ui.all);

  const filteredLessons = React.useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesTags =
        activeTags.length === 0 || activeTags.some((tag) => lesson.tags.includes(tag));
      const matchesLevel = level === ui.all || lesson.level === level;
      const minutes = parseReadTime(lesson.readTime);
      const matchesTime =
        time === ui.all ||
        (time === ui.timeOptions[0] && minutes > 0 && minutes <= 10) ||
        (time === ui.timeOptions[1] && minutes > 10 && minutes <= 20) ||
        (time === ui.timeOptions[2] && minutes > 20);
      const matchesUpdated = updated === ui.all || lesson.updatedAt === updated;
      return matchesTags && matchesLevel && matchesTime && matchesUpdated;
    });
  }, [lessons, activeTags, level, time, updated, ui]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  return (
    <section className="fx-section">
      <div className="mb-5 flex items-center gap-3 text-xs text-slate-200/60">
        <Link
          href="/academy"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200/70 transition hover:border-sky-400/40 hover:bg-white/10 hover:text-slate-50"
          aria-label={ui.back}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{ui.back}</span>
        </Link>
        <span className="text-[11px] font-semibold tracking-[0.16em] text-slate-200/50">
          {locale === "zh" ? "学院" : "Academy"}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="academy-card p-4">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {ui.filter}
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs font-semibold text-slate-100/80">{ui.tag}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={[
                        "academy-tag",
                        activeTags.includes(tag) ? "academy-tag-active" : ""
                      ].join(" ")}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-100/80">{ui.level}</div>
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="academy-input mt-2"
                >
                  <option value={ui.all}>{ui.all}</option>
                  {levels.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-100/80">{ui.time}</div>
                <select
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="academy-input mt-2"
                >
                  <option value={ui.all}>{ui.all}</option>
                  {ui.timeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-100/80">{ui.updated}</div>
                <select
                  value={updated}
                  onChange={(event) => setUpdated(event.target.value)}
                  className="academy-input mt-2"
                >
                  <option value={ui.all}>{ui.all}</option>
                  {updates.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </aside>

        <div>
          <div className="mb-4">
            <div className="academy-eyebrow">{locale === "zh" ? "模块" : "Module"}</div>
            <h1 className="academy-h1 mt-3">{category.title}</h1>
            <p className="academy-lead">{category.desc}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filteredLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                href={`/academy/${lesson.categoryId}/${lesson.slug}`}
                ctaLabel={ui.start}
              />
            ))}
            {!filteredLessons.length ? (
              <Card className="academy-card p-5 text-sm text-slate-200/70">
                {locale === "zh" ? "暂无匹配课程。" : "No lessons match the filters."}
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
