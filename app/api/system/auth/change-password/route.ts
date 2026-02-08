import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireSystemUser } from "@/lib/system/guard";
import { dbFirst, dbRun } from "@/lib/db/d1";
import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(64)
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSystemUser();

    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    if (!isStrongSystemPassword(parsed.data.newPassword)) {
      return json({ ok: false, error: "WEAK_PASSWORD" }, 400);
    }

    const row = await dbFirst<{ password_hash: string | null }>(
      `select password_hash from profiles where id = ?`,
      [ctx.user.id]
    );
    const hash = String(row?.password_hash || "");
    if (!hash) return json({ ok: false, error: "NO_PASSWORD_SET" }, 403);

    const ok = await bcrypt.compare(parsed.data.currentPassword, hash);
    if (!ok) return json({ ok: false, error: "BAD_PASSWORD" }, 401);

    const nextHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await dbRun(
      `update profiles set password_hash = ?, updated_at = ? where id = ?`,
      [nextHash, new Date().toISOString(), ctx.user.id]
    );

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

