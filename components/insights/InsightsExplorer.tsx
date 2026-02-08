"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Pillar } from "@/lib/domain/types";

type PostPreview = {
  slug: string;
  pillar: Pillar;
  title: string;
  excerpt: string;
  readingTime: number;
  popularity: number;
  publishedAt: string;
  publishedAtTs: number;
  tags: string[];
  url?: string;
};

type Props = {
  posts: PostPreview[];
};

type PillarFilter = "all" | Pillar;
type SortKey = "latest" | "popular";

function labelKey(pillar: Pillar) {
  if (pillar === "mind") return "mind";
  if (pillar === "market") return "market";
  if (pillar === "price_action") return "price";
  return "price";
}

export function InsightsExplorer({ posts }: Props) {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");

  const [query, setQuery] = useState("");
  const [pillar, setPillar] = useState<PillarFilter>("all");
  const [sort, setSort] = useState<SortKey>("latest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = posts.filter((post) => {
      const matchesPillar = pillar === "all" ? true : post.pillar === pillar;
      if (!matchesPillar) return false;
      if (!q) return true;
      const hay = `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...base].sort((a, b) => {
      if (sort === "popular") {
        const byPopularity = b.popularity - a.popularity;
        if (byPopularity !== 0) return byPopularity;
      }
      return b.publishedAtTs - a.publishedAtTs;
    });

    return sorted;
  }, [pillar, posts, query, sort]);

  return (
    <div className="mt-10 space-y-6">
      <div className="fx-card p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
              {t("title")}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
              {t("filters.all")}
            </span>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value as PillarFilter)}
              className="fx-select mt-2"
            >
              <option value="all">{t("filters.all")}</option>
              <option value="mind">{t("filters.mind")}</option>
              <option value="market">{t("filters.market")}</option>
              <option value="price_action">{t("filters.price")}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
              {t("sort.latest")}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="fx-select mt-2"
            >
              <option value="latest">{t("sort.latest")}</option>
              <option value="popular">{t("sort.popular")}</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="fx-card p-8 text-center text-sm text-slate-200/70">{t("empty")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((post) => {
            const card = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="fx-pill">
                    {tCommon(`labels.${labelKey(post.pillar)}` as any)}
                  </span>
                  <span className="text-xs text-slate-200/60">
                    {post.publishedAt} · {post.readingTime}
                    {tCommon("ui.minutesShort")}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-50">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/70">{post.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="fx-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            );

            if (post.url) {
              return (
                <a
                  key={post.slug}
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="fx-card block p-7"
                >
                  {card}
                </a>
              );
            }

            return (
              <Link key={post.slug} href={`/insights/${post.slug}`} className="fx-card block p-7">
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
