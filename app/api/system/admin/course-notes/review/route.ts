import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  noteId: z.string().uuid(),
  reviewNote: z.string().max(2000).optional().nullable()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireManager();
    if (user.role === "coach") return json({ ok: false, error: "FORBIDDEN" }, 403);
    const admin = supabaseAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const { data: note, error } = await admin
      .from("course_notes")
      .select("id,user_id,course_id,submitted_at,reviewed_at")
      .eq("id", parsed.data.noteId)
      .maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!note?.id || !note.user_id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (!note.submitted_at) return json({ ok: false, error: "NOT_SUBMITTED" }, 400);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(admin, user.id);
      if (!treeIds.includes(note.user_id)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.includes(note.user_id)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const now = new Date().toISOString();
    const reviewNote = String(parsed.data.reviewNote || "").trim();

    const { error: upErr } = await admin
      .from("course_notes")
      .update({
        reviewed_at: now,
        reviewed_by: user.id,
        review_note: reviewNote || null
      })
      .eq("id", note.id);

    if (upErr) return json({ ok: false, error: upErr.message }, 500);

    const courseId = Number(note.course_id || 0);
    const title = reviewNote
      ? "课程总结已回�?/ Course summary replied"
      : "课程总结已阅 / Course summary reviewed";
    const content = reviewNote
      ? `�?{courseId}课总结已回复：${reviewNote}\n\nLesson ${courseId} summary note: ${reviewNote}`
      : `�?{courseId}课总结已阅。\n\nLesson ${courseId} summary reviewed.`;

    await admin.from("notifications").insert({
      to_user_id: note.user_id,
      from_user_id: user.id,
      title,
      content
    } as any);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
