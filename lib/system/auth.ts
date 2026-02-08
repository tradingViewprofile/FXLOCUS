import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isAdminRole, normalizeSystemRole } from "@/lib/system/roles";
import { fetchProfileBySession, sessionCookieName, verifySessionCookie } from "@/lib/system/session";

export type Locale = "zh" | "en";

export type SystemUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "student" | "trader" | "coach" | "assistant" | "leader" | "super_admin";
  leader_id: string | null;
  student_status:
    | "\u666e\u901a\u5b66\u5458"
    | "\u8003\u6838\u901a\u8fc7"
    | "\u5b66\u4e60\u4e2d"
    | "\u6350\u8d60\u5b66\u5458"
    | "\u8003\u6838\u901a\u8fc7+\u6350\u8d60\u5b66\u5458";
  status: "active" | "frozen" | "deleted";
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  leader_id: string | null;
  student_status: string | null;
  status: string | null;
  session_id?: string | null;
};

export async function getSystemAuth() {
  cookies();

  try {
    const token = cookies().get(sessionCookieName())?.value || "";
    if (!token) return { ok: false as const, reason: "NO_SESSION" as const };
    const claims = await verifySessionCookie(token).catch(() => null);
    if (!claims) return { ok: false as const, reason: "NO_SESSION" as const };

    const profile = (await fetchProfileBySession(claims.uid, claims.sid)) as ProfileRow | null;
    if (!profile?.id) return { ok: false as const, reason: "NO_SESSION" as const };

    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) return { ok: false as const, reason: "NO_EMAIL" as const };

    if ((profile as any).status === "frozen" || (profile as any).status === "deleted") {
      return { ok: false as const, reason: "FROZEN" as const };
    }
    const normalizedRole = normalizeSystemRole(profile.role);
    if (!normalizedRole) return { ok: false as const, reason: "INVALID_ROLE" as const };

    return {
      ok: true as const,
      user: {
        id: profile.id,
        email,
        full_name: (profile as any).full_name ?? null,
        phone: (profile as any).phone ?? null,
        role: normalizedRole as SystemUser["role"],
        leader_id: (profile as any).leader_id ?? null,
        student_status: profile.student_status as SystemUser["student_status"],
        status: ((profile as any).status ?? "active") as SystemUser["status"]
      }
    };
  } catch {
    return { ok: false as const, reason: "AUTH_FAILED" as const };
  }
}

export async function requireSystemUser(locale: Locale) {
  const res = await getSystemAuth();
  if (!res.ok) {
    if (res.reason === "FROZEN") redirect(`/${locale}/system/403`);
    redirect(`/${locale}/system/login`);
  }
  return res.user;
}

export async function requireAdmin(locale: Locale) {
  const user = await requireSystemUser(locale);
  if (!isAdminRole(user.role)) redirect(`/${locale}/system/403`);
  return user;
}

export async function requireCoach(locale: Locale) {
  const user = await requireSystemUser(locale);
  if (user.role !== "coach") redirect(`/${locale}/system/403`);
  return user;
}

export async function requireAssistant(locale: Locale) {
  const user = await requireSystemUser(locale);
  if (user.role !== "assistant") redirect(`/${locale}/system/403`);
  return user;
}
