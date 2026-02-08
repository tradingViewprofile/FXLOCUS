import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // This site uses `/insights` as the primary content hub.
  // Keep `/blog` as a stable, indexable entry point.
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("insightsTitle"),
    description: t("insightsDesc")
  };
}

export default async function BlogPage({ params }: Props) {
  const locale = params.locale === "en" ? "en" : "zh";
  return (
    <section className="fx-section">
      <div className="fx-container">
        <div className="fx-card p-8 md:p-10">
          <div className="fx-eyebrow">{locale === "zh" ? "内容" : "Content"}</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
            {locale === "zh" ? "博客" : "Blog"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200/70 md:text-lg">
            {locale === "zh"
              ? "我们的文章与市场要点已统一收录�?Insights�?
              : "Articles and market notes are available in Insights."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/insights" locale={locale} className="fx-btn fx-btn-primary">
              {locale === "zh" ? "前往 Insights" : "Go to Insights"}
            </Link>
            <Link href="/framework" locale={locale} className="fx-btn fx-btn-secondary">
              {locale === "zh" ? "查看交易框架" : "View Framework"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

