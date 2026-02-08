import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEARNER_ROLES = ["student", "trader", "coach"] as const;
const STATUS_OPTIONS = ["考核通过", "捐赠学员", "考核通过+捐赠学员"] as const;
const PASS_STATUSES = ["考核通过", "考核通过+捐赠学员"] as const;
const Body = z.object({
  student_status: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1)
  )
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  try {
    const { user, supabase } = await requireManager();
    if (user.role === "coach") return json({ ok: false, error: "FORBIDDEN" }, 403);
    if (user.role === "assistant") return json({ ok: false, error: "FORBIDDEN" }, 403);
    const userId = String(ctx.params.userId || "");
    if (!userId) return json({ ok: false, error: "INVALID_USER" }, 400);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(userId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const db = user.role === "super_admin" ? supabase : supabaseAdmin();

    const { data: target, error: targetErr } = await db
      .from("profiles")
      .select("id,role,student_status,created_by")
      .eq("id", userId)
      .maybeSingle();
    if (targetErr) return json({ ok: false, error: targetErr.message }, 500);
    if (!target?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (!LEARNER_ROLES.includes(target.role)) return json({ ok: false, error: "INVALID_TARGET" }, 400);
    const nextStatus = parsed.data.student_status;
    if (!STATUS_OPTIONS.includes(nextStatus as any)) {
      return json({ ok: false, error: "INVALID_STATUS" }, 400);
    }
    let nextRole = target.role;
    if (target.role === "student" && PASS_STATUSES.includes(nextStatus as any)) {
      nextRole = "trader";
    } else if (target.role === "trader" && !PASS_STATUSES.includes(nextStatus as any)) {
      nextRole = "student";
    }

    const patch: Record<string, unknown> = {
      student_status: nextStatus,
      updated_at: new Date().toISOString()
    };
    if (nextRole !== target.role) patch.role = nextRole;

    const up = await db.from("profiles").update(patch as any).eq("id", userId).select("id").maybeSingle();
    if (up.error) return json({ ok: false, error: up.error.message }, 500);
    if (!up.data?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    return json({ ok: true, role: nextRole });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}



