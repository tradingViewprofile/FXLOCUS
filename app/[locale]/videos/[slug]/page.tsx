import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { defaultLocale } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";
import type { Pillar } from "@/lib/domain/types";

type Props = {
  params: { locale: Locale; slug: string };
};

function labelKey(pillar: Pillar) {
  if (pillar === "mind") return "mind";
  if (pillar === "market") return "market";
  return "price";
}

export async function generateStaticParams() {
  const provider = getDataProvider();
  const videos = await provider.listVideos(defaultLocale);
  return videos.map((video) => ({ slug: video.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getDataProvider();
  const video = await provider.getVideo(params.locale, params.slug);
  if (!video) return {};
  return { title: video.title, description: video.excerpt };
}

export default async function VideoDetailPage({ params }: Props) {
  const locale = params.locale;
  const provider = getDataProvider();
  const video = await provider.getVideo(locale, params.slug);
  if (!video) notFound();

  const t = await getTranslations({ locale, namespace: "videos" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const relatedInsights = video.relatedSlugs?.length
    ? (
        await Promise.all(
          video.relatedSlugs.map(async (slug) => provider.getInsight(locale, slug))
        )
      ).filter((v): v is NonNullable<typeof v> => Boolean(v))
    : (await provider.listInsights(locale))
        .filter((p) => p.pillar === video.pillar)
        .slice(0, 3);

  return (
    <div className="space-y-12">
      <header className="pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/70">
          <span className="fx-pill">{tCommon(`labels.${labelKey(video.pillar)}` as any)}</span>
          <span>{video.durationMin ? `${video.durationMin}${tCommon("ui.minutesShort")}` : "--"}</span>
          <span>·</span>
          <span>{video.publishedAt ?? ""}</span>
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {video.title}
        </h1>
        <p className="fx-lead">{video.excerpt}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/videos" locale={locale} className="fx-btn fx-btn-secondary">
            {tCommon("cta.back")}
          </Link>
          <Link href="/framework" locale={locale} className="fx-btn fx-btn-secondary">
            {tCommon("cta.enterFramework")}
          </Link>
        </div>
      </header>

      <section className="fx-section">
        <div className="fx-card p-3">
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-200/80">
              {locale === "zh"
                ? "当前您没有访问权限，请联系我们�?
                : "Access denied. Please contact us for permissions."}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="fx-card p-7">
            <h2 className="text-sm font-semibold tracking-[0.16em] text-slate-200/70">
              {t("detail.keyPoints")}
            </h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200/75">
              {(video.points ?? []).slice(0, 6).map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fx-card p-7">
            <h2 className="text-sm font-semibold tracking-[0.16em] text-slate-200/70">
              {t("detail.homework")}
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-200/75">
              {video.homework ?? t("detail.homeworkFallback")}
            </p>
          </div>
        </div>
      </section>

      {relatedInsights.length ? (
        <section className="fx-section">
          <h2 className="fx-h2">{t("detail.related")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {relatedInsights.slice(0, 3).map((p) => (
              <Link key={p.slug} href={`/insights/${p.slug}`} locale={locale} className="fx-card p-6">
                <h3 className="text-base font-semibold text-slate-50">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/70">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
