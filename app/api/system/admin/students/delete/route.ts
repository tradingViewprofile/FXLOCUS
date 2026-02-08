import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireAdmin();
    const admin = supabaseAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));

    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const userId = parsed.data.userId;

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.includes(userId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const { data: target, error: targetErr } = await admin.from("profiles").select("id,role").eq("id", userId).maybeSingle();
    if (targetErr) return json({ ok: false, error: targetErr.message }, 500);
    if (!target?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    const learnerRoles = ["student", "trader", "coach"];
    if (!learnerRoles.includes(target.role)) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const now = new Date().toISOString();
    const { error: statusErr } = await admin
      .from("profiles")
      .update({ status: "deleted", updated_at: now, session_id: null } as any)
      .eq("id", userId);
    if (statusErr) return json({ ok: false, error: statusErr.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
