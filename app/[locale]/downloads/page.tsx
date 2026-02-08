import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { getDataProvider } from "@/lib/data";
import { DownloadsGrid } from "@/components/downloads/DownloadsGrid";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("downloadsTitle"),
    description: t("downloadsDesc")
  };
}

export default async function DownloadsPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "downloads" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const provider = getDataProvider();
  const downloads = await provider.listDownloads(locale);

  return (
    <div className="space-y-14 md:space-y-20">
      <header className="pt-6">
        <span className="fx-eyebrow">{tCommon(locale === "en" ? "brandEn" : "brandCn")}</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
          {t("title")}
        </h1>
        <p className="fx-lead">{t("lead")}</p>
      </header>

      <DownloadsGrid downloads={downloads} />
    </div>
  );
}

