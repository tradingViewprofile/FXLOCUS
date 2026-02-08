import { NextResponse } from "next/server";

import { requireLearner } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireLearner();
    const body = await req.json().catch(() => null);

    const courseId = Number(body?.courseId);
    if (!Number.isInteger(courseId) || courseId < 1 || courseId > 21) {
      return json({ ok: false, error: "INVALID_COURSE" }, 400);
    }

    if (courseId > 1) {
      const { data: prevNote, error: prevErr } = await supabase
        .from("course_notes")
        .select("submitted_at")
        .eq("user_id", user.id)
        .eq("course_id", courseId - 1)
        .maybeSingle();
      if (prevErr) return json({ ok: false, error: "DB_ERROR" }, 500);
      if (!prevNote?.submitted_at) {
        return json({ ok: false, error: "PREV_SUMMARY_REQUIRED" }, 400);
      }
    }

    const now = new Date().toISOString();
    const { data: existing, error: existErr } = await supabase
      .from("course_access")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existErr) return json({ ok: false, error: "DB_ERROR" }, 500);

    if (!existing) {
      const ins = await supabase.from("course_access").insert({
        user_id: user.id,
        course_id: courseId,
        status: "requested",
        requested_at: now,
        updated_at: now
      });
      if (ins.error) return json({ ok: false, error: "DB_ERROR" }, 500);
      return json({ ok: true });
    }

    if (existing.status === "rejected") {
      const up = await supabase
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
      if (up.error) return json({ ok: false, error: "DB_ERROR" }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
