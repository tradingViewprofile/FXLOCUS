import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcademyCategory } from "@/components/academy/AcademyCategory";
import type { Locale } from "@/i18n/routing";
import { getAcademyCategories, getAcademyLessonsByCategory, getAllCategoryIds } from "@/lib/academy/data";

type Props = {
  params: { locale: Locale; category: string };
};

export function generateStaticParams() {
  return getAllCategoryIds().map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getAcademyCategories(params.locale).find((item) => item.id === params.category);
  if (!category) return {};
  return { title: category.title, description: category.desc };
}

export default async function AcademyCategoryPage({ params }: Props) {
  const locale = params.locale;
  const category = getAcademyCategories(locale).find((item) => item.id === params.category);
  if (!category) notFound();
  const lessons = getAcademyLessonsByCategory(locale, category.id);

  return (
    <div className="space-y-14 md:space-y-20">
      <AcademyCategory locale={locale} category={category} lessons={lessons} />
    </div>
  );
}
