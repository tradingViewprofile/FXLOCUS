import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/lib/mock/types";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("termsTitle"),
    description: t("termsDesc")
  };
}

export default async function TermsPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "terms" });

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
        <div className="space-y-8">
          {(["s1", "s2", "s3"] as const).map((k) => (
            <section key={k} className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-50">{t(`sections.${k}Title`)}</h2>
              <p className="text-sm leading-6 text-slate-200/75">{t(`sections.${k}Body`)}</p>
            </section>
          ))}
        </div>

        <div id="risk" className="mt-10 fx-glass p-6">
          <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
            {t("sections.s2Title")}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200/75">{t("riskFooter")}</p>
        </div>
      </article>
    </div>
  );
}
