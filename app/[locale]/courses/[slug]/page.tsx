import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: params.slug };
}

export default function CourseDetailPage({ params }: Props) {
  redirect(`/${params.locale}/courses`);
}
