import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AcademyHome } from "@/components/academy/AcademyHome";
import type { Locale } from "@/i18n/routing";
import { getAcademyCategories, getAcademyLessons } from "@/lib/academy/data";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("academyTitle"),
    description: t("academyDesc")
  };
}

export default async function AcademyPage({ params }: Props) {
  const locale = params.locale;
  const categories = getAcademyCategories(locale);
  const lessons = getAcademyLessons(locale);

  return (
    <div className="space-y-14 md:space-y-20">
      <AcademyHome locale={locale} categories={categories} lessons={lessons} />
    </div>
  );
}
