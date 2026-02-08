import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";
import type { GlossaryTerm, Pillar } from "@/lib/domain/types";

type Props = {
  params: { locale: Locale };
};

function labelKey(pillar: Pillar) {
  if (pillar === "mind") return "mind";
  if (pillar === "market") return "market";
  return "price";
}

function groupByPillar(items: GlossaryTerm[]) {
  const grouped: Record<Pillar, GlossaryTerm[]> = { mind: [], market: [], price_action: [] };
  for (const item of items) grouped[item.pillar].push(item);
  return grouped;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("glossaryTitle"),
    description: t("glossaryDesc")
  };
}

export default async function GlossaryPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "glossary" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const provider = getDataProvider();
  const terms = await provider.listGlossary(locale);
  const grouped = groupByPillar(terms);

  return (
    <div className="space-y-14 md:space-y-20">
      <header className="pt-6">
        <span className="fx-eyebrow">{tCommon(locale === "en" ? "brandEn" : "brandCn")}</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {t("title")}
        </h1>
        <p className="fx-lead">{t("lead")}</p>
      </header>

      {(
        [
          { pillar: "mind" as const },
          { pillar: "market" as const },
          { pillar: "price_action" as const }
        ] as const
      ).map(({ pillar }) => (
        <section key={pillar} className="fx-section">
          <h2 className="fx-h2">{tCommon(`labels.${labelKey(pillar)}` as any)}</h2>
          <div className="mt-8 grid gap-3">
            {grouped[pillar].map((term) => {
              const misconceptions = term.misconceptions ?? [];
              const related = term.related ?? [];

              return (
                <Card as="details" key={term.slug} className="p-6">
                <summary className="cursor-pointer text-sm font-semibold text-slate-50">
                  {term.term}
                </summary>
                <div className="mt-4 space-y-4 text-sm leading-6 text-slate-200/75">
                  <p className="text-slate-100/85">{term.oneLiner}</p>

                  {misconceptions.length ? (
                    <div>
                      <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                        {t("labels.misconceptions")}
                      </div>
                      <ul className="mt-3 space-y-2">
                        {misconceptions.slice(0, 6).map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                      {t("labels.frameworkNote")}
                    </div>
                    <p className="mt-2">{term.frameworkNote}</p>
                  </div>

                  {related.length ? (
                    <div>
                      <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                        {t("labels.related")}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {related.slice(0, 6).map((item) => (
                          <Link
                            key={`${item.href}-${item.label}`}
                            href={item.href}
                            className="fx-pill hover:text-slate-50"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
