import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { dbFirst, dbRun } from "@/lib/db/d1";
import { normalizeSystemRole } from "@/lib/system/roles";
import { sessionCookieName, signSessionCookie } from "@/lib/system/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NormalizedRole = "super_admin" | "leader" | "student" | "trader" | "coach" | "assistant";

type ProfileAuthRow = {
  id: string;
  email: string | null;
  role: string;
  password_hash: string | null;
  last_login_user_agent: string | null;
};

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const email = normalizeEmail(body?.email ?? body?.identifier ?? body?.username);
    const password = String(body?.password ?? body?.pwd ?? "").trim();
    const roleRaw = body?.role ?? body?.accountType ?? body?.type ?? body?.loginAs ?? body?.identity;
    const expectedRole = normalizeSystemRole(roleRaw) as NormalizedRole | null;

    if (!email || !password) return json({ ok: false, error: "MISSING_CREDENTIALS" }, 400);
    if (!expectedRole) return json({ ok: false, error: "INVALID_ROLE" }, 400);

    const profile = await dbFirst<ProfileAuthRow>(
      `select id,email,role,password_hash,last_login_user_agent
       from profiles
       where lower(email) = lower(?)
       limit 1`,
      [email]
    );
    if (!profile?.id) return json({ ok: false, error: "INVALID_CREDENTIALS" }, 401);

    const hash = String(profile.password_hash || "");
    if (!hash) return json({ ok: false, error: "NO_PASSWORD_SET" }, 403);

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return json({ ok: false, error: "INVALID_CREDENTIALS" }, 401);

    const actualRole = normalizeSystemRole(profile.role) as NormalizedRole | null;
    if (!actualRole) return json({ ok: false, error: "INVALID_ROLE" }, 403);

    const learnerRoles = new Set<NormalizedRole>(["student", "trader", "coach", "assistant"]);
    const roleOk = expectedRole === "student" ? learnerRoles.has(actualRole) : actualRole === expectedRole;
    const roleMismatch = !roleOk;

    const cookieStore = cookies();
    const host = req.headers.get("host") || "";
    const hostName = host.split(":")[0] || "";
    const cookieDomain =
      hostName === "fxlocus.com" || hostName.endsWith(".fxlocus.com") ? ".fxlocus.com" : undefined;
    const forwardedProto = req.headers.get("x-forwarded-proto") || "";
    const isSecure = forwardedProto === "https" || req.nextUrl.protocol === "https:";

    const sid = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const token = await signSessionCookie({ uid: profile.id, sid }, expiresAt);

    cookieStore.set(sessionCookieName(), token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 30
    });

    const forwarded = req.headers.get("x-forwarded-for") || "";
    const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const now = new Date().toISOString();

    const prevUa = String(profile.last_login_user_agent || "").trim();
    const deviceChanged = prevUa && userAgent && prevUa !== userAgent;

    await dbRun(
      `update profiles
       set last_login_at = ?,
           last_login_ip = ?,
           last_login_user_agent = ?,
           session_id = ?,
           session_expires_at = ?,
           updated_at = ?
       where id = ?`,
      [now, ip || null, userAgent || null, sid, expiresAt.toISOString(), now, profile.id]
    );

    if (deviceChanged) {
      const noteId = crypto.randomUUID();
      const ipLabel = ip ? `IP�?{ip}` : "";
      const uaLabel = userAgent ? `设备�?{userAgent}` : "";
      const details = [ipLabel, uaLabel].filter(Boolean).join("�?);
      await dbRun(
        `insert into notifications (id, to_user_id, from_user_id, title, content, created_at)
         values (?, ?, ?, ?, ?, ?)`,
        [
          noteId,
          profile.id,
          null,
          "安全提醒",
          `检测到新的登录设备�?{details ? `${details}。` : ""}若非本人操作，请立即修改密码。`,
          now
        ]
      );
    }

    return json({
      ok: true,
      role: actualRole,
      roleMismatch,
      expectedRole,
      profile: { id: profile.id, email: profile.email, role: actualRole },
      user: { id: profile.id, email: profile.email, full_name: null, role: actualRole }
    });
  } catch (e: any) {
    console.error("login failed:", e);
    return json({ ok: false, error: "SERVER_ERROR" }, 500);
  }
}


