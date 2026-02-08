import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireLearner } from "@/lib/system/guard";
import { buildStudentSubmitContent, notifyLeadersAndAdmins } from "@/lib/system/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  contentHtml: z.string().max(200_000).optional(),
  contentText: z.string().max(200_000).optional(),
  submit: z.boolean().optional()
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: NextRequest, ctx: { params: { courseId: string } }) {
  let userId = "";
  let actor: Awaited<ReturnType<typeof requireLearner>>["user"] | null = null;
  let supabase: Awaited<ReturnType<typeof requireLearner>>["supabase"];
  try {
    const res = await requireLearner();
    userId = res.user.id;
    actor = res.user;
    supabase = res.supabase;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const courseId = Number(ctx.params.courseId);
  if (!Number.isInteger(courseId) || courseId < 1 || courseId > 21) {
    return noStoreJson({ ok: false, error: "INVALID_COURSE" }, 400);
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  const now = new Date().toISOString();

  const { data: access } = await supabase!
    .from("course_access")
    .select("id,status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!access) return noStoreJson({ ok: false, error: "NO_ACCESS" }, 403);
  if (access.status !== "approved" && access.status !== "completed") {
    return noStoreJson({ ok: false, error: "NOT_APPROVED" }, 403);
  }

  const contentHtml = String(parsed.data.contentHtml || "");
  const contentText = String(parsed.data.contentText || "");
  const isSubmit = Boolean(parsed.data.submit);
  const hasContent = contentText.trim().length > 0 || contentHtml.trim().length > 0;
  if (isSubmit && !hasContent) return noStoreJson({ ok: false, error: "MISSING_CONTENT" }, 400);

  const payload: Record<string, any> = {
    user_id: userId,
    course_id: courseId,
    content_md: contentText,
    content_html: contentHtml,
    updated_at: now
  };

  if (isSubmit) {
    payload.submitted_at = now;
    payload.reviewed_at = null;
    payload.reviewed_by = null;
    payload.review_note = null;
  }

  const { error } = await supabase!.from("course_notes").upsert(payload, {
    onConflict: "user_id,course_id"
  });

  if (error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
  if (isSubmit && actor) {
    await notifyLeadersAndAdmins(actor, {
      title: "课程总结提交 / Course summary submitted",
      content: buildStudentSubmitContent(
        actor,
        `提交了第 ${courseId} 课总结。`,
        `submitted course #${courseId} summary.`
      )
    });
  }
  return noStoreJson({ ok: true, submitted: isSubmit });
}
