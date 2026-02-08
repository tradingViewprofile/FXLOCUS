import { redirect } from "next/navigation";
import { unstable_noStore } from "next/cache";

import { AdminCourseContentClient } from "@/components/system/admin/AdminCourseContentClient";
import { requireSystemUser } from "@/lib/system/auth";
import { isSuperAdmin } from "@/lib/system/roles";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_COURSE_ID = 20;

export default async function AdminCourseContentPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const user = await requireSystemUser(locale);
  if (!isSuperAdmin(user.role)) redirect(`/${locale}/system/403`);

  const admin = supabaseAdmin();
  const { data: coursesRaw } = await admin.from("courses").select("*").order("id", { ascending: true }).limit(200);

  let courses = (coursesRaw || []) as any[];
  const existing = new Set(courses.map((c) => Number(c.id)));
  const missing = Array.from({ length: BASE_COURSE_ID }, (_, idx) => idx + 1)
      .filter((id) => !existing.has(id))
      .map((id) => ({
        id,
        title_zh: `�?{id}课`,
        title_en: `Lesson ${id}`,
        summary_zh: "课程内容准备中�?,
        summary_en: "Content coming soon.",
        published: false
      }));
  if (missing.length) {
    await admin.from("courses").upsert(missing as any, { onConflict: "id", ignoreDuplicates: true });
    const { data: refreshed } = await admin.from("courses").select("*").order("id", { ascending: true }).limit(200);
    courses = (refreshed || courses) as any[];
  }

  const coursesById = new Map(courses.map((c) => [Number(c.id), c]));
  const baseCourses = Array.from({ length: BASE_COURSE_ID }, (_, idx) => {
    const id = idx + 1;
    const existing = coursesById.get(id) || {};
    return {
      id,
      ...existing,
      title_zh: existing.title_zh || `�?{id}课`,
      title_en: existing.title_en || `Lesson ${id}`,
      summary_zh: existing.summary_zh || "课程内容准备中�?,
      summary_en: existing.summary_en || "Content coming soon."
    };
  });
  const extraCourses = courses.filter((course) => Number(course.id) > BASE_COURSE_ID);
  const fullCourses = [...baseCourses, ...extraCourses].sort((a, b) => Number(a.id) - Number(b.id));

  return <AdminCourseContentClient locale={locale} initialCourses={fullCourses as any[]} />;
}

