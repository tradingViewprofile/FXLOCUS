import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["leader", "coach"]),
  direct: z.boolean().optional()
});

const LEARNER_ROLES = ["student", "trader", "coach"] as const;
const LEADER_PROMOTABLE_ROLES = ["student", "trader", "coach", "assistant"] as const;

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  let actorId = "";
  let actorRole: "leader" | "super_admin" = "leader";
  try {
    const { user } = await requireAdmin();
    actorId = user.id;
    actorRole = user.role === "super_admin" ? "super_admin" : "leader";
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const userId = ctx.params.userId;
  if (!userId) return noStoreJson({ ok: false, error: "INVALID_USER" }, 400);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  const admin = supabaseAdmin();
  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id,role,leader_id,student_status")
    .eq("id", userId)
    .maybeSingle();

  if (targetErr) return noStoreJson({ ok: false, error: targetErr.message }, 500);
  if (!target?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

  if (actorRole === "leader") {
    const treeIds = await fetchLeaderTreeIds(admin, actorId);
    if (!treeIds.includes(target.id)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }

  const now = new Date().toISOString();
  const action = parsed.data.action;
  const direct = actorRole === "super_admin" && parsed.data.direct === true;

  if (action === "leader") {
    if (target.role === "leader") return noStoreJson({ ok: true, role: "leader" });
    if (!LEADER_PROMOTABLE_ROLES.includes(target.role as any)) {
      return noStoreJson({ ok: false, error: "INVALID_TARGET" }, 400);
    }

    const update = { role: "leader", updated_at: now } as any;
    if (direct) update.leader_id = actorId;
    const { error: upErr } = await admin.from("profiles").update(update).eq("id", target.id);

    if (upErr) return noStoreJson({ ok: false, error: upErr.message }, 500);

    await admin.from("role_audit_logs").insert({
      target_id: target.id,
      actor_id: actorId,
      from_role: target.role,
      to_role: "leader",
      reason: null,
      created_at: now
    } as any);

    return noStoreJson({ ok: true, role: "leader" });
  }

  if (action === "coach") {
    if (target.role === "coach") return noStoreJson({ ok: true, role: "coach" });
    if (!LEARNER_ROLES.includes(target.role)) return noStoreJson({ ok: false, error: "INVALID_TARGET" }, 400);
    if (!direct && target.student_status !== "考核通过" && target.student_status !== "考核通过+捐赠学员") {
      return noStoreJson({ ok: false, error: "NOT_ELIGIBLE" }, 400);
    }

    const update = { role: "coach", updated_at: now } as any;
    if (direct) update.leader_id = actorId;
    const { error: coachErr } = await admin.from("profiles").update(update).eq("id", target.id);

    if (coachErr) return noStoreJson({ ok: false, error: coachErr.message }, 500);

    await admin.from("role_audit_logs").insert({
      target_id: target.id,
      actor_id: actorId,
      from_role: target.role,
      to_role: "coach",
      reason: null,
      created_at: now
    } as any);

    return noStoreJson({ ok: true, role: "coach" });
  }

  return noStoreJson({ ok: false, error: "INVALID_ACTION" }, 400);
}
