import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/marketing/PageHero";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";
import type { Pillar } from "@/lib/domain/types";

type Props = {
  params: { locale: Locale };
};

function labelKey(pillar: Pillar) {
  if (pillar === "mind") return "mind";
  if (pillar === "market") return "market";
  return "price";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("videosTitle"),
    description: t("videosDesc")
  };
}

export default async function VideosPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "videos" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const highlights = t.raw("hero.highlights") as string[];

  const provider = getDataProvider();
  const videos = await provider.listVideos(locale);

  return (
    <div className="space-y-14 md:space-y-20">
      <PageHero
        locale={locale}
        eyebrow={tCommon(locale === "en" ? "brandEn" : "brandCn")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        highlights={highlights}
        ctas={[
          { href: "/framework", label: t("hero.cta.primary"), variant: "secondary" },
          { href: "/contact", label: t("hero.cta.secondary"), variant: "secondary" }
        ]}
        riskNote={t("hero.risk")}
      />

      <section className="fx-section">
        <div className="grid gap-4 md:grid-cols-2">
          {videos.map((video) => (
            <Link key={video.slug} href={`/videos/${video.slug}`} locale={locale} className="fx-card block p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="fx-pill">
                  {tCommon(`labels.${labelKey(video.pillar)}` as any)}
                </span>
                <span className="text-xs text-slate-200/60">
                  {video.durationMin ? `${video.durationMin}${tCommon("ui.minutesShort")}` : "--"} · {video.publishedAt ?? ""}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-50">{video.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{video.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {video.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="fx-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
