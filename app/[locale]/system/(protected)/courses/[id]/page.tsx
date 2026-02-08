import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";

import { CourseAccessGateClient } from "@/components/system/CourseAccessGateClient";
import { CoursePlayerClient } from "@/components/system/CoursePlayerClient";
import { getSystemAuth } from "@/lib/system/auth";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CoursePage({
  params
}: {
  params: { locale: "zh" | "en"; id: string };
}) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const courseId = Number(params.id);
  if (!courseId || courseId < 1 || courseId > 21) redirect(`/${locale}/system/courses`);

  const auth = await getSystemAuth();
  if (!auth.ok) return null;

  const admin = supabaseAdmin();
  const prevNotePromise =
    courseId > 1
      ? admin
          .from("course_notes")
          .select("submitted_at")
          .eq("user_id", auth.user.id)
          .eq("course_id", courseId - 1)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [{ data: course }, { data: access }, { data: note }, { data: prevNote }] = await Promise.all([
    admin.from("courses").select("*").eq("id", courseId).maybeSingle(),
    admin.from("course_access").select("*").eq("user_id", auth.user.id).eq("course_id", courseId).maybeSingle(),
    admin.from("course_notes").select("*").eq("user_id", auth.user.id).eq("course_id", courseId).maybeSingle(),
    prevNotePromise
  ]);

  if (!course) redirect(`/${locale}/system/courses`);

  const status = (access as any)?.status || "none";
  const canView = status === "approved" || status === "completed";

  if (!canView) {
    const blocked = courseId > 1 && !prevNote?.submitted_at;
    const blockedReason = blocked
      ? locale === "zh"
        ? "请先提交上一课总结/收获"
        : "Submit the previous summary first."
      : null;
    return (
      <CourseAccessGateClient
        locale={locale}
        courseId={courseId}
        status={status}
        rejectionReason={(access as any)?.rejection_reason || null}
        blocked={blocked}
        blockedReason={blockedReason}
      />
    );
  }

  const publishedRaw = (course as any)?.published;
  const deletedAt = (course as any)?.deleted_at;
  const isPublished = !deletedAt && (typeof publishedRaw === "boolean" ? publishedRaw : true);

  const bucket = (course as any)?.content_bucket;
  const path = (course as any)?.content_path;
  const mime = String((course as any)?.content_mime_type || "");
  const fileName = (course as any)?.content_file_name || null;
  const ext = String(fileName || path || "")
    .toLowerCase()
    .split(".")
    .pop();
  const isVideo = mime.startsWith("video/") || ext === "mp4";
  const isDoc = mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("text/") || ext === "pdf";
  const variantsRaw = (course as any)?.video_variants;
  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];

  let signedUrl: string | null = null;
  if (bucket && path) {
    signedUrl = await createSignedDownloadUrl(admin, bucket, path, 3600);
  }

  const courseForClient: any = { ...course };
  if (signedUrl) {
    if (isVideo) {
      courseForClient.video_url = signedUrl;
    } else if (isDoc) {
      courseForClient.doc_url = signedUrl;
    } else {
      courseForClient.content_url = `/api/system/courses/${courseId}/download`;
      courseForClient.content_file_name = fileName;
      courseForClient.content_mime_type = mime || null;
    }
  }

  if (isVideo && variants.length) {
    const signedVariants = [];
    for (const variant of variants) {
      const label = String(variant?.label || variant?.quality || "").trim();
      const path = String(variant?.path || "").trim();
      const bucketName = String(variant?.bucket || bucket || "").trim();
      if (!label || !path || !bucketName) continue;
      const signed = await createSignedDownloadUrl(admin, bucketName, path, 3600);
      if (!signed) continue;
      signedVariants.push({
        label,
        url: signed,
        mime_type: variant?.mime_type || null
      });
    }
    if (signedVariants.length) {
      courseForClient.video_variants = signedVariants;
    }
  }

  const hasContent = Boolean(
    courseForClient.video_url ||
      courseForClient.doc_url ||
      courseForClient.content_url ||
      (courseForClient.video_variants && courseForClient.video_variants.length)
  );
  const isReleased = isPublished || canView;
  if (!isReleased || !hasContent) {
    return (
      <div className="space-y-6 max-w-[900px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/90 font-semibold text-xl">
            {locale === "zh" ? `�?{courseId}课` : `Lesson ${courseId}`}
          </div>
          <div className="mt-3 text-white/60 text-sm leading-6">
            {locale === "zh" ? "课程内容尚未发布�? : "Course content is not published yet."}
          </div>
          <div className="mt-4">
            <a
              className="inline-flex px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              href={`/${locale}/system/courses`}
            >
              {locale === "zh" ? "返回课程列表" : "Back to courses"}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CoursePlayerClient
      locale={locale}
      course={courseForClient}
      access={access as any}
      initialSummary={
        note
          ? {
              content_md: note.content_md || "",
              content_html: note.content_html || null,
              submitted_at: note.submitted_at || null,
              reviewed_at: note.reviewed_at || null,
              review_note: note.review_note || null
            }
          : null
      }
    />
  );
}


