import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  newPassword: z.string().min(8).max(64).optional()
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function randomStrongPassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*_-+=?";
  const all = `${upper}${lower}${digits}${special}`;

  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  let user: Awaited<ReturnType<typeof requireAdmin>>["user"] | null = null;
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"] | null = null;
  try {
    const ctxAdmin = await requireAdmin();
    user = ctxAdmin.user;
    supabase = ctxAdmin.supabase;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const userId = ctx.params.userId;
  if (!userId) return noStoreJson({ ok: false, error: "INVALID_USER" }, 400);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  if (user?.role === "leader") {
    const treeIds = await fetchLeaderTreeIds(supabase!, user.id);
    if (!treeIds.includes(userId)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
  }

  const nextPassword = parsed.data.newPassword || randomStrongPassword();
  if (!isStrongSystemPassword(nextPassword)) {
    return noStoreJson({ ok: false, error: "WEAK_PASSWORD" }, 400);
  }

  const admin = supabaseAdmin();

  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .maybeSingle();

  if (targetErr) return noStoreJson({ ok: false, error: targetErr.message }, 500);
  if (!target?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
  const learnerRoles = ["student", "trader", "coach"];
  if (!learnerRoles.includes(target.role)) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);

  const hash = await bcrypt.hash(nextPassword, 12);
  const now = new Date().toISOString();
  const up = await admin
    .from("profiles")
    .update({ password_hash: hash, session_id: null, session_expires_at: null, updated_at: now } as any)
    .eq("id", userId);
  if (up.error) return noStoreJson({ ok: false, error: up.error.message }, 500);

  return noStoreJson({ ok: true, newPassword: nextPassword });
}

