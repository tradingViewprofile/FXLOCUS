import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["active", "frozen"])
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  const { user, supabase } = await requireManager();
  if (user.role === "coach") {
    return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }
  const userId = ctx.params.userId;
  if (!userId) return noStoreJson({ ok: false, error: "INVALID_USER" }, 400);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  if (user.role === "leader") {
    const treeIds = await fetchLeaderTreeIds(supabase, user.id);
    if (!treeIds.includes(userId)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }
  if (user.role === "assistant") {
    const admin = supabaseAdmin();
    const { data: target, error } = await admin
      .from("profiles")
      .select("id,created_by")
      .eq("id", userId)
      .maybeSingle();
    if (error) return noStoreJson({ ok: false, error: error.message }, 500);
    if (!target?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
    if (target.created_by !== user.id) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }

  const db = user.role === "super_admin" ? supabase : supabaseAdmin();

  const now = new Date().toISOString();

  const { data: updated, error } = await db
    .from("profiles")
    .update({ status: parsed.data.status, updated_at: now } as any)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) return noStoreJson({ ok: false, error: error.message }, 500);
  if (!updated?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

  return noStoreJson({ ok: true });
}
