import { NextRequest, NextResponse } from "next/server";

import { requireLearner } from "@/lib/system/guard";
import { buildStudentSubmitContent, notifyLeadersAndAdmins } from "@/lib/system/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(_req: NextRequest, ctx: { params: { courseId: string } }) {
  let userId = "";
  let actor: Awaited<ReturnType<typeof requireLearner>>["user"] | null = null;
  let supabase: Awaited<ReturnType<typeof requireLearner>>["supabase"];
  try {
    const { user, supabase: sb } = await requireLearner();
    userId = user.id;
    actor = user;
    supabase = sb;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const courseId = Number(ctx.params.courseId);
  if (!Number.isInteger(courseId) || courseId < 1 || courseId > 21) {
    return noStoreJson({ ok: false, error: "INVALID_COURSE" }, 400);
  }

  const now = new Date().toISOString();

  const { data: existing, error: existErr } = await supabase!
    .from("course_access")
    .select("id,status")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existErr) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);

  if (!existing) {
    const { error } = await supabase!.from("course_access").insert({
      user_id: userId,
      course_id: courseId,
      status: "requested",
      requested_at: now,
      updated_at: now
    });
    if (error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
    if (actor) {
      await notifyLeadersAndAdmins(actor, {
        title: "课程申请 / Course request",
        content: buildStudentSubmitContent(actor, `申请了第 ${courseId} 课。`, `requested course #${courseId}.`)
      });
    }
    return noStoreJson({ ok: true });
  }

  if (existing.status === "rejected") {
    const { error } = await supabase!
      .from("course_access")
      .update({
        status: "requested",
        requested_at: now,
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        updated_at: now
      })
      .eq("id", existing.id);
    if (error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
    if (actor) {
      await notifyLeadersAndAdmins(actor, {
        title: "课程申请 / Course request",
        content: buildStudentSubmitContent(actor, `申请了第 ${courseId} 课。`, `requested course #${courseId}.`)
      });
    }
  }

  return noStoreJson({ ok: true });
}

