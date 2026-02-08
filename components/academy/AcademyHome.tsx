"use client";

import React from "react";

import { AcademyIcon } from "@/components/academy/AcademyIcon";
import { LessonCard } from "@/components/academy/LessonCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Category, Lesson } from "@/lib/academy/types";

type Props = {
  locale: "zh" | "en";
  categories: Category[];
  lessons: Lesson[];
};

type ProgressEntry = {
  checklist?: Record<string, boolean>;
  lastSeen?: string;
};

const PROGRESS_KEY = "academy.progress.v1";

function parseReadTime(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function readProgressStore() {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") || {}) as Record<
      string,
      ProgressEntry
    >;
  } catch {
    return {};
  }
}

export function AcademyHome({ locale, categories, lessons }: Props) {
  const ui = React.useMemo(
    () =>
      locale === "zh"
        ? {
            title: "汇点学院",
            lead: "系统化交易学习路径：先理解结构，再训练执行。",
            searchTitle: "快速查找课程",
            searchHint: "关键词、标签、难度与时间筛选。",
            filters: {
              query: "关键词",
              tag: "标签",
              level: "难度",
              time: "阅读时间"
            },
            all: "全部",
            timeOptions: ["10分钟内", "10-20分钟", "20分钟以上"],
            modules: "模块入口",
            continue: "继续学习",
            continueEmpty: "尚未开始学习，先从精选课程进入。",
            featured: "本周精选",
            updated: "新更新",
            popular: "最受欢迎",
            start: "开始学习",
            progress: "进度"
          }
        : {
            title: "Academy",
            lead: "A system learning path: understand structure first, then train execution.",
            searchTitle: "Find a lesson",
            searchHint: "Filter by keyword, tag, level, and read time.",
            filters: {
              query: "Keywords",
              tag: "Tag",
              level: "Level",
              time: "Read time"
            },
            all: "All",
            timeOptions: ["Under 10 min", "10-20 min", "Over 20 min"],
            modules: "Modules",
            continue: "Continue learning",
            continueEmpty: "No recent lessons yet. Start with a featured lesson.",
            featured: "Featured this week",
            updated: "Recently updated",
            popular: "Most popular",
            start: "Start learning",
            progress: "Progress"
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

  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState(ui.all);
  const [level, setLevel] = React.useState(ui.all);
  const [time, setTime] = React.useState(ui.all);
  const [recentLessons, setRecentLessons] = React.useState<
    { lesson: Lesson; progress: number }[]
  >([]);

  React.useEffect(() => {
    const store = readProgressStore();
    const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const items = Object.entries(store)
      .map(([lessonId, entry]) => {
        const lesson = lessonMap.get(lessonId);
        if (!lesson) return null;
        const total = lesson.checklistItems.length || 1;
        const done = Object.values(entry.checklist ?? {}).filter(Boolean).length;
        return {
          lesson,
          progress: Math.round((done / total) * 100),
          lastSeen: entry.lastSeen ?? ""
        };
      })
      .filter((item): item is { lesson: Lesson; progress: number; lastSeen: string } => Boolean(item))
      .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1))
      .slice(0, 3);
    setRecentLessons(items);
  }, [lessons]);

  const filteredLessons = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesQuery =
        !q ||
        lesson.title.toLowerCase().includes(q) ||
        lesson.summary.toLowerCase().includes(q) ||
        lesson.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTag = tag === ui.all || lesson.tags.includes(tag);
      const matchesLevel = level === ui.all || lesson.level === level;
      const minutes = parseReadTime(lesson.readTime);
      const matchesTime =
        time === ui.all ||
        (time === ui.timeOptions[0] && minutes > 0 && minutes <= 10) ||
        (time === ui.timeOptions[1] && minutes > 10 && minutes <= 20) ||
        (time === ui.timeOptions[2] && minutes > 20);

      return matchesQuery && matchesTag && matchesLevel && matchesTime;
    });
  }, [lessons, query, tag, level, time, ui]);

  const [activeTab, setActiveTab] = React.useState<"featured" | "updated" | "popular">("featured");
  const recommended = React.useMemo(() => {
    if (activeTab === "updated") return lessons.slice().reverse().slice(0, 3);
    if (activeTab === "popular") return lessons.slice(0, 3).reverse();
    return lessons.slice(0, 3);
  }, [activeTab, lessons]);

  const pillLabels = locale === "zh" ? ["指南", "清单", "案例", "工具", "FAQ"] : ["Guide", "Checklist", "Cases", "Tools", "FAQ"];

  return (
    <div className="space-y-12">
      <section className="fx-section">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="academy-eyebrow">{locale === "zh" ? "学院" : "Academy"}</div>
            <h1 className="academy-h1 mt-3">{ui.title}</h1>
            <p className="academy-lead">{ui.lead}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {pillLabels.map((item) => (
                <Badge key={item} className="text-[11px]">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <Card className="academy-card p-5">
            <div className="text-sm font-semibold text-slate-50">{ui.searchTitle}</div>
            <p className="mt-1 text-xs text-slate-200/60">{ui.searchHint}</p>
            <div className="mt-3 grid gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={ui.filters.query}
                className="academy-input"
              />
              <div className="grid gap-2 md:grid-cols-3">
                <select value={tag} onChange={(event) => setTag(event.target.value)} className="academy-input">
                  <option value={ui.all}>{ui.filters.tag}</option>
                  {tags.map((tagItem) => (
                    <option key={tagItem} value={tagItem}>
                      {tagItem}
                    </option>
                  ))}
                </select>
                <select value={level} onChange={(event) => setLevel(event.target.value)} className="academy-input">
                  <option value={ui.all}>{ui.filters.level}</option>
                  {levels.map((levelItem) => (
                    <option key={levelItem} value={levelItem}>
                      {levelItem}
                    </option>
                  ))}
                </select>
                <select value={time} onChange={(event) => setTime(event.target.value)} className="academy-input">
                  <option value={ui.all}>{ui.filters.time}</option>
                  {ui.timeOptions.map((timeItem) => (
                    <option key={timeItem} value={timeItem}>
                      {timeItem}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredLessons.length ? (
              <div className="mt-4 space-y-2">
                {filteredLessons.slice(0, 3).map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/academy/${lesson.categoryId}/${lesson.slug}`}
                    className="academy-search-item"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{lesson.title}</div>
                      <div className="mt-1 text-xs text-slate-200/60">{lesson.subtitle}</div>
                    </div>
                    <span className="text-xs text-slate-200/60">{lesson.readTime}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-200/50">{locale === "zh" ? "暂无匹配结果。" : "No matches."}</div>
            )}
          </Card>
        </div>
      </section>

      <section className="fx-section">
        <h2 className="academy-h2">{ui.modules}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.id} href={`/academy/${category.id}`} className="academy-card academy-module-card">
              <AcademyIcon name={category.icon} className="h-6 w-6 text-sky-300" />
              <div className="mt-4 text-lg font-semibold text-slate-50">{category.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{category.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="fx-section">
        <h2 className="academy-h2">{ui.continue}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recentLessons.length ? (
            recentLessons.map(({ lesson, progress }) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                progress={progress}
                href={`/academy/${lesson.categoryId}/${lesson.slug}`}
                ctaLabel={ui.start}
                progressLabel={ui.progress}
              />
            ))
          ) : (
            <Card className="academy-card md:col-span-3 p-5 text-sm text-slate-200/70">
              {ui.continueEmpty}
            </Card>
          )}
        </div>
      </section>

      <section className="fx-section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="academy-h2">{locale === "zh" ? "推荐课程" : "Recommended"}</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: "featured" as const, label: ui.featured },
              { id: "updated" as const, label: ui.updated },
              { id: "popular" as const, label: ui.popular }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "academy-tab",
                  activeTab === tab.id ? "academy-tab-active" : ""
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recommended.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              href={`/academy/${lesson.categoryId}/${lesson.slug}`}
              ctaLabel={ui.start}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
