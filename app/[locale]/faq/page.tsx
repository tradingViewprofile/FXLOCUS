import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/marketing/PageHero";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

type FaqSection = {
  title: string;
  items: Array<{ q: string; a: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("faqTitle"),
    description: t("faqDesc")
  };
}

export default async function FaqPage({ params }: Props) {
  const locale = params.locale;
  const tFaq = await getTranslations({ locale, namespace: "faq" });

  const highlights = tFaq.raw("hero.highlights") as string[];
  const sections = tFaq.raw("sections") as FaqSection[];

  return (
    <div className="space-y-14 md:space-y-20">
      <PageHero
        locale={locale}
        eyebrow={tFaq("hero.eyebrow")}
        title={tFaq("hero.title")}
        subtitle={tFaq("hero.subtitle")}
        highlights={highlights}
        ctas={[
          { href: "/contact", label: tFaq("hero.cta.primary"), variant: "primary" },
          { href: "/framework", label: tFaq("hero.cta.secondary"), variant: "secondary" }
        ]}
        riskNote={tFaq("hero.risk")}
      />

      <section className="fx-section space-y-10">
        {sections.map((section, sectionIndex) => (
          <div key={`${section.title}-${sectionIndex}`} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="fx-pill text-slate-100/80">
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-2xl font-semibold text-slate-50">{section.title}</h2>
            </div>

            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <Card
                  as="details"
                  key={`${section.title}-${itemIndex}`}
                  className="p-6"
                  open={sectionIndex === 0 && itemIndex === 0}
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-50">
                    {item.q}
                  </summary>
                  <div className="mt-4 text-sm leading-6 text-slate-200/75">
                    {item.a}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="fx-section">
        <Card className="p-8 md:p-10">
          <span className="fx-eyebrow">{tFaq("cta.eyebrow")}</span>
          <h2 className="mt-5 text-2xl font-semibold text-slate-50 md:text-3xl">
            {tFaq("cta.title")}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200/75">
            {tFaq("cta.lead")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/contact" locale={locale} variant="primary">
              {tFaq("cta.primary")}
            </ButtonLink>
            <ButtonLink href="/about" locale={locale} variant="secondary">
              {tFaq("cta.secondary")}
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-slate-200/60">{tFaq("cta.note")}</p>
        </Card>
      </section>
    </div>
  );
}
