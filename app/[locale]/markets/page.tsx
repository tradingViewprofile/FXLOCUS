import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";

import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

const MarketsTerminal = dynamic(
  () => import("@/components/markets/MarketsTerminal").then((mod) => mod.MarketsTerminal),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] w-full items-center justify-center bg-slate-950/40">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
          Loading markets...
        </div>
      </div>
    )
  }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("marketsTitle"),
    description: t("marketsDesc")
  };
}

export default async function MarketsPage({ params }: Props) {
  const locale = params.locale === "en" ? "en" : "zh";
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-12 -mb-20 w-screen">
      <MarketsTerminal locale={locale} />
    </div>
  );
}
