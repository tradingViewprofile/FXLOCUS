import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/lib/mock/types";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("privacyTitle"),
    description: t("privacyDesc")
  };
}

export default async function PrivacyPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: "privacy" });

  return (
    <div className="space-y-12 pt-6">
      <header>
        <span className="fx-eyebrow">{t("updated")}</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {t("title")}
        </h1>
        <p className="fx-lead">{t("lead")}</p>
      </header>

      <article className="fx-card p-8">
        <div className="prose prose-invert max-w-none prose-headings:text-slate-50">
          {(["s1", "s2", "s3", "s4"] as const).map((k) => (
            <section key={k} className="mb-8 last:mb-0">
              <h2 className="text-xl font-semibold">{t(`sections.${k}Title`)}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200/75">
                {t(`sections.${k}Body`)}
              </p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
