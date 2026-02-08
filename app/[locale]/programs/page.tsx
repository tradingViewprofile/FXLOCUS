import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/marketing/PageHero";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/mock/types";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("programsTitle"),
    description: t("programsDesc")
  };
}

export default async function ProgramsPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "programs" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const tiers = ["course", "camp", "audit"] as const;
  const flowSteps = t.raw("flow.steps") as string[];
  const highlights = t.raw("hero.highlights") as string[];

  return (
    <div className="space-y-14 md:space-y-20">
      <PageHero
        locale={locale}
        eyebrow={tCommon(locale === "en" ? "brandEn" : "brandCn")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        highlights={highlights}
        ctas={[
          { href: "/contact", label: t("hero.cta.primary"), variant: "primary" },
          { href: "/framework", label: t("hero.cta.secondary"), variant: "secondary" }
        ]}
        riskNote={t("hero.risk")}
      />

      <section className="fx-section">
        <span className="fx-eyebrow">{tCommon("cta.getStarted")}</span>
        <h2 className="fx-h2">{t("title")}</h2>
        <p className="fx-lead">{t("lead")}</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => {
            const deliver = t.raw(`tiers.${tier}.deliver`) as string[];
            return (
              <div key={tier} className="fx-card flex flex-col p-7">
                <div className="fx-pill">{tCommon(`tiers.${tier}` as any)}</div>
                <h3 className="mt-5 text-xl font-semibold text-slate-50">
                  {t(`tiers.${tier}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/70">
                  {t(`tiers.${tier}.lead`)}
                </p>

                {tier === "course" ? (
                  <div className="mt-5 space-y-2 text-sm text-slate-200/75">
                    <div className="fx-glass p-4">{t(`tiers.${tier}.for`)}</div>
                    <div className="fx-glass p-4">{t(`tiers.${tier}.notFor`)}</div>
                  </div>
                ) : null}

                <div className="mt-6">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                    {tCommon("ui.deliverables")}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                    {deliver.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link href="/contact" locale={locale} className="fx-btn fx-btn-secondary">
                    {t(`tiers.${tier}.cta`)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="fx-section">
        <span className="fx-eyebrow">{t("flow.title")}</span>
        <h2 className="fx-h2">{t("flow.title")}</h2>

        <div className="mt-10 fx-card p-6 md:p-10">
          <div className="relative">
            <div className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-sky-400/70 via-white/20 to-transparent md:hidden" />
            <div className="absolute left-6 right-6 top-5 hidden h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent md:block" />

            <div className="space-y-6 md:flex md:gap-6 md:space-y-0">
              {flowSteps.map((step, index) => (
                <div
                  key={step}
                  className="relative flex gap-4 md:flex-1 md:flex-col md:items-start"
                >
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/60 bg-slate-950/80 text-sm font-semibold text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.25)]">
                    {index + 1}
                  </div>
                  <div className="fx-glass w-full p-4 md:mt-4">
                    <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                      {tCommon("ui.step")} {index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200/80">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="fx-section">
        <span className="fx-eyebrow">{t("faqTitle")}</span>
        <h2 className="fx-h2">{t("faqTitle")}</h2>
        <p className="fx-lead">{t("faqLead")}</p>

        <div className="mt-10 space-y-3">
          {(["q1", "q2", "q3", "q4", "q5"] as const).map((key) => (
            <details key={key} className="fx-card p-6" open={key === "q1"}>
              <summary className="cursor-pointer text-sm font-semibold text-slate-50">
                {t(`faq.items.${key}.q`)}
              </summary>
              <div className="mt-4 text-sm leading-6 text-slate-200/75">
                <p>{t(`faq.items.${key}.a`)}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/contact" locale={locale} className="fx-btn fx-btn-primary">
            {tCommon("cta.bookCall")}
          </Link>
        </div>
      </section>
    </div>
  );
}
