import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string().uuid(),
  coachId: z.string().uuid().nullable().optional()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const userId = parsed.data.userId;
    const coachId = parsed.data.coachId ? parsed.data.coachId : null;

    const { data: target, error: targetErr } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", userId)
      .maybeSingle();
    if (targetErr) return json({ ok: false, error: targetErr.message }, 500);
    if (!target?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (target.role !== "student" && target.role !== "trader") {
      return json({ ok: false, error: "INVALID_TARGET_ROLE" }, 400);
    }

    if (coachId) {
      const { data: coach, error: coachErr } = await supabase
        .from("profiles")
        .select("id,role")
        .eq("id", coachId)
        .maybeSingle();
      if (coachErr) return json({ ok: false, error: coachErr.message }, 500);
      if (!coach?.id) return json({ ok: false, error: "COACH_NOT_FOUND" }, 404);
      if (coach.role !== "coach") return json({ ok: false, error: "INVALID_COACH_ROLE" }, 400);
    }

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(userId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (coachId && !treeIds.includes(coachId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    if (coachId) {
      const up = await supabase.from("coach_assignments").upsert(
        {
          assigned_user_id: userId,
          coach_id: coachId,
          assigned_by: user.id
        } as any,
        { onConflict: "assigned_user_id" }
      );
      if (up.error) return json({ ok: false, error: up.error.message }, 500);
    } else {
      const del = await supabase.from("coach_assignments").delete().eq("assigned_user_id", userId);
      if (del.error) return json({ ok: false, error: del.error.message }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
