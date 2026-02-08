import { unstable_noStore } from "next/cache";

import { getSystemAuth } from "@/lib/system/auth";
import { isSuperAdmin } from "@/lib/system/roles";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { CoursesClient } from "@/components/system/CoursesClient";
import { AdminCourseAccessClient } from "@/components/system/admin/AdminCourseAccessClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CoursesPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const auth = await getSystemAuth();
  if (!auth.ok) return null;

  if (isSuperAdmin(auth.user.role)) {
    return <AdminCourseAccessClient locale={locale} />;
  }

  const admin = supabaseAdmin();
  const [{ data: coursesRaw }, { data: access }, { data: notes }] = await Promise.all([
    admin.from("courses").select("*").order("id", { ascending: true }),
    admin.from("course_access").select("*").eq("user_id", auth.user.id),
    admin.from("course_notes").select("course_id,submitted_at").eq("user_id", auth.user.id)
  ]);

  let courses = (coursesRaw || []) as any[];
  if (courses.length < 21) {
    const existing = new Set(courses.map((c) => Number(c.id)));
    const missing = Array.from({ length: 21 }, (_, idx) => idx + 1)
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
      const { data: refreshed } = await admin.from("courses").select("*").order("id", { ascending: true });
      courses = (refreshed || courses) as any[];
    }
  }

  const coursesById = new Map(courses.map((c) => [Number(c.id), c]));
  const fullCourses = Array.from({ length: 21 }, (_, idx) => {
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

  return (
    <CoursesClient
      locale={locale}
      courses={fullCourses as any[]}
      access={(access || []) as any[]}
      notes={(notes || []) as any[]}
    />
  );
}

