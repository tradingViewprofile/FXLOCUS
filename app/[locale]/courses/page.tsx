import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PublicCoursesClient } from "@/components/courses/PublicCoursesClient";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("coursesTitle"),
    description: t("coursesDesc")
  };
}

export default async function CoursesPage({ params }: Props) {
  const locale = params.locale;

  return (
    <div className="space-y-10 md:space-y-14">
      <PublicCoursesClient locale={locale} />
    </div>
  );
}
