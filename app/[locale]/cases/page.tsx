import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("casesTitle"),
    description: t("casesDesc")
  };
}

export default async function CasesPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "cases" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const provider = getDataProvider();
  const cases = await provider.listCases(locale);

  return (
    <div className="space-y-14 md:space-y-20">
      <header className="pt-6">
        <span className="fx-eyebrow">{tCommon(locale === "en" ? "brandEn" : "brandCn")}</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {t("title")}
        </h1>
        <p className="fx-lead">{t("lead")}</p>
      </header>

      <section className="fx-section">
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((item) => (
            <Link key={item.slug} href={`/cases/${item.slug}`} className="fx-card block p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="fx-pill">{tCommon("labels.price")}</span>
                <span className="text-xs text-slate-200/60">{item.tags.slice(0, 2).join(" · ")}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-50">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{item.marketContext}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

