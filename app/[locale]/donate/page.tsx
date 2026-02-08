import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";

import { PageHero } from "@/components/marketing/PageHero";
import { getDonatePrice } from "@/lib/donate/pricing";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

const DonateClient = dynamic(
  () => import("@/components/donate/DonateClient").then((mod) => mod.DonateClient),
  {
    ssr: false,
    loading: () => (
      <div className="fx-card flex min-h-[360px] items-center justify-center text-sm text-slate-200/70">
        加载捐赠数据�?..
      </div>
    )
  }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("donateTitle"),
    description: t("donateDesc")
  };
}

export default async function DonatePage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "donate" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const highlights = t.raw("hero.highlights") as string[];
  const priceSeed = await getDonatePrice().catch(() => null);

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHero
        locale={locale}
        eyebrow={tCommon(locale === "en" ? "brandEn" : "brandCn")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        highlights={highlights}
        ctas={[{ href: "/programs", label: t("hero.cta.secondary"), variant: "secondary" }]}
        riskNote={t("hero.risk")}
      />
      <div id="apply" className="scroll-mt-24">
        <DonateClient
          initialPrice={priceSeed?.price}
          initialNextUpdateAt={priceSeed?.nextUpdateAt}
        />
      </div>
    </div>
  );
}

