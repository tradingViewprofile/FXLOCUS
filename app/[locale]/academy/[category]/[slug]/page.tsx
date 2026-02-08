import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonPageClient } from "@/components/academy/LessonPageClient";
import type { Locale } from "@/i18n/routing";
import { getAcademyCategories, getAllLessonParams, getLessonBySlug } from "@/lib/academy/data";

type Props = {
  params: { locale: Locale; category: string; slug: string };
};

export function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getAcademyCategories(params.locale).find((item) => item.id === params.category);
  if (!category) return {};
  const lesson = getLessonBySlug(params.locale, category.id, params.slug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.summary };
}

export default async function LessonPage({ params }: Props) {
  const locale = params.locale;
  const category = getAcademyCategories(locale).find((item) => item.id === params.category);
  if (!category) notFound();
  const lesson = getLessonBySlug(locale, category.id, params.slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-14 md:space-y-20">
      <LessonPageClient locale={locale} lesson={lesson} category={category} />
    </div>
  );
}
