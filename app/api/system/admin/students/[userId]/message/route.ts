import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(10_000)
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  const { user, supabase } = await requireManager();
  if (user.role === "coach") return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  const userId = ctx.params.userId;
  if (!userId) return noStoreJson({ ok: false, error: "INVALID_USER" }, 400);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  const admin = supabaseAdmin();
  const db = user.role === "assistant" ? admin : supabase;

  const { data: target, error: targetErr } = await db
    .from("profiles")
    .select("id,role,leader_id,created_by")
    .eq("id", userId)
    .maybeSingle();
  if (targetErr) return noStoreJson({ ok: false, error: targetErr.message }, 500);
  if (!target?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

  if (user.role === "leader") {
    const treeIds = await fetchLeaderTreeIds(supabase, user.id);
    if (!treeIds.includes(target.id)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  } else if (user.role === "assistant") {
    if (target.created_by !== user.id) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }

  const { error } = await db.from("notifications").insert({
    to_user_id: userId,
    from_user_id: user.id,
    title: parsed.data.title || "Message",
    content: parsed.data.content
  });

  if (error) return noStoreJson({ ok: false, error: error.message }, 500);
  return noStoreJson({ ok: true });
}
