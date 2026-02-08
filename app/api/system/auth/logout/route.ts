import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { dbRun } from "@/lib/db/d1";
import { sessionCookieName, verifySessionCookie } from "@/lib/system/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  try {
    const token = cookies().get(sessionCookieName())?.value || "";
    const claims = token ? await verifySessionCookie(token).catch(() => null) : null;
    if (claims?.uid) {
      // Best-effort revoke.
      await dbRun(
        `update profiles set session_id = null, session_expires_at = null, updated_at = ? where id = ?`,
        [new Date().toISOString(), claims.uid]
      ).catch(() => null);
    }

    const res = json({ ok: true });
    res.cookies.set({
      name: sessionCookieName(),
      value: "",
      path: "/",
      maxAge: 0
    });
    return res;
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "LOGOUT_FAILED" }, 500);
  }
}


