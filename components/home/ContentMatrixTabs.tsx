"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { CourseAccess, CourseLevel, Pillar } from "@/lib/domain/types";

type ArticlePreview = {
  slug: string;
  pillar: Pillar;
  title: string;
  excerpt: string;
  readingMinutes: number;
  publishedAt: string;
};

type VideoPreview = {
  slug: string;
  pillar: Pillar;
  title: string;
  excerpt: string;
  durationMin: number;
  publishedAt: string;
  thumbnail: string;
};

type CoursePreview = {
  slug: string;
  pillar: Pillar;
  title: string;
  excerpt: string;
  access: CourseAccess;
  level: CourseLevel;
  lessonsCount: number;
  estimatedHours: number;
  tags: string[];
};

type Props = {
  articles: ArticlePreview[];
  videos: VideoPreview[];
  courses: CoursePreview[];
};

type TabKey = "articles" | "videos" | "courses";

function pillLabelKey(pillar: Pillar) {
  if (pillar === "mind") return "mind";
  if (pillar === "market") return "market";
  return "price";
}

export function ContentMatrixTabs({ articles, videos, courses }: Props) {
  const t = useTranslations("home.matrix");
  const tLabels = useTranslations("common.labels");
  const tCommon = useTranslations("common");
  const tCourses = useTranslations("courses");

  const [tab, setTab] = useState<TabKey>("articles");

  const tabs = useMemo(
    () =>
      [
        { key: "articles" as const, label: t("tabs.articles") },
        { key: "videos" as const, label: t("tabs.videos") },
        { key: "courses" as const, label: t("tabs.courses") }
      ] satisfies Array<{ key: TabKey; label: string }>,
    [t]
  );

  return (
    <div className="mt-8">
      <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              className={[
                "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                active ? "bg-white/10 text-slate-50" : "text-slate-200/70 hover:text-slate-50"
              ].join(" ")}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "articles" ? (
        <div className="mt-6 space-y-4">
          <div className="fx-card overflow-hidden p-0">
            <ul className="divide-y divide-white/10">
              {articles.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/insights/${post.slug}`}
                    className="block px-6 py-5 transition-colors hover:bg-white/5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="fx-pill">{tLabels(pillLabelKey(post.pillar))}</span>
                      <span className="tabular-nums text-xs text-slate-200/60 whitespace-nowrap">
                        {post.publishedAt} · {post.readingMinutes}
                        {tCommon("ui.minutesShort")}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-50">{post.title}</h3>
                    <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-slate-200/70">
                      {post.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Link href="/insights" className="fx-btn fx-btn-secondary">
              {t("ctaAllArticles")}
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "videos" ? (
        <div className="mt-6 space-y-4">
          <div className="space-y-3">
            {videos.map((video) => (
              <Link key={video.slug} href={`/videos/${video.slug}`} className="fx-card block overflow-hidden p-0">
                <div className="grid gap-0 sm:grid-cols-[240px_1fr]">
                  <div className="relative aspect-video bg-slate-950/40">
                    {video.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
                    )}
                    <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-50 tabular-nums whitespace-nowrap">
                      {video.durationMin}
                      {tCommon("ui.minutesShort")}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="fx-pill">{tLabels(pillLabelKey(video.pillar))}</span>
                      <span className="tabular-nums text-xs text-slate-200/60 whitespace-nowrap">
                        {video.publishedAt}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-50">{video.title}</h3>
                    <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-slate-200/70">
                      {video.excerpt}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div>
            <Link href="/videos" className="fx-btn fx-btn-secondary">
              {t("ctaAllVideos")}
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "courses" ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {courses.map((course) => (
              <div key={course.slug} className="fx-card flex flex-col p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="fx-pill">{tLabels(pillLabelKey(course.pillar))}</span>
                  <span className="tabular-nums text-xs text-slate-200/60 whitespace-nowrap">
                    {tCourses(`level.${course.level}` as any)} · {course.lessonsCount}
                    {t("lessonsShort")}
                    {course.estimatedHours ? ` · ~${course.estimatedHours}${t("hoursShort")}` : ""}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-50">{course.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/70">{course.excerpt}</p>

                <div className="mt-5 space-y-3 text-sm text-slate-200/75">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                      {t("courseYouGet")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {course.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="fx-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                      {t("courseAccess")}
                    </div>
                    <div className="mt-2">{tCourses(`access.${course.access}` as any)}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href={`/courses/${course.slug}`} className="fx-btn fx-btn-secondary w-full justify-center">
                    {t("courseCta")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div>
            <Link href="/courses" className="fx-btn fx-btn-secondary">
              {t("ctaAllCourses")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
