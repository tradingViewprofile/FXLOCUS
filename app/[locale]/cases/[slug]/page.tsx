import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";

type Props = {
  params: { locale: Locale; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getDataProvider();
  const item = await provider.getCase(params.locale, params.slug);
  if (!item) return {};
  return { title: item.title, description: item.marketContext };
}

export default async function CaseDetailPage({ params }: Props) {
  const locale = params.locale;
  const provider = getDataProvider();
  const item = await provider.getCase(locale, params.slug);
  if (!item) notFound();

  const t = await getTranslations({ locale, namespace: "cases" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="space-y-12">
      <header className="pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200/70">
          <span className="fx-pill">{tCommon("labels.price")}</span>
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="fx-pill">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {item.title}
        </h1>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/cases" locale={locale} className="fx-btn fx-btn-secondary">
            {tCommon("cta.back")}
          </Link>
          <Link href="/framework" locale={locale} className="fx-btn fx-btn-secondary">
            {tCommon("cta.enterFramework")}
          </Link>
        </div>
      </header>

      <section className="fx-section">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-7">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.marketContext")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.marketContext}</p>
          </Card>

          <Card className="p-7">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.commonMistake")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.commonMistake}</p>
          </Card>

          <Card className="p-7">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.force")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.forceNote}</p>
          </Card>

          <Card className="p-7">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.location")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.locationNote}</p>
          </Card>

          <Card className="p-7 md:col-span-2">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.falsification")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.falsificationNote}</p>
          </Card>

          <Card className="p-7 md:col-span-2">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("labels.homework")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-100/85">{item.homework}</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
