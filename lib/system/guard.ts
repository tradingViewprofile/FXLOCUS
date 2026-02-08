import { cookies } from "next/headers";

import {
  isAdminRole,
  isLearnerRole,
  isSuperAdmin,
  normalizeSystemRole,
  type SystemRole
} from "@/lib/system/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchProfileBySession, sessionCookieName, verifySessionCookie } from "@/lib/system/session";

export type SystemStatus = "active" | "frozen" | "deleted";
export type { SystemRole };

export type SystemUserSafe = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: SystemRole;
  leader_id: string | null;
  student_status:
    | "\u666e\u901a\u5b66\u5458"
    | "\u8003\u6838\u901a\u8fc7"
    | "\u5b66\u4e60\u4e2d"
    | "\u6350\u8d60\u5b66\u5458"
    | "\u8003\u6838\u901a\u8fc7+\u6350\u8d60\u5b66\u5458";
  status: SystemStatus;
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
  session_expires_at?: string | null;
};

function err(code: string) {
  const e = new Error(code);
  (e as any).code = code;
  return e;
}

export async function getSystemContext(): Promise<{
  user: SystemUserSafe;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}> {
  const token = cookies().get(sessionCookieName())?.value || "";
  if (!token) throw err("UNAUTHORIZED");

  const claims = await verifySessionCookie(token).catch(() => null);
  if (!claims) throw err("UNAUTHORIZED");

  const profile = (await fetchProfileBySession(claims.uid, claims.sid)) as ProfileRow | null;
  if (!profile?.id) throw err("UNAUTHORIZED");

  const email = String(profile.email || "").trim().toLowerCase();
  if (!email) throw err("UNAUTHORIZED");

  if ((profile as any).status === "frozen" || (profile as any).status === "deleted") {
    throw err("FROZEN");
  }
  const normalizedRole = normalizeSystemRole(profile.role);
  if (!normalizedRole) throw err("FORBIDDEN");

  return {
    supabase: createSupabaseAdminClient(),
    user: {
      id: profile.id,
      email,
      full_name: (profile as any).full_name ?? null,
      phone: (profile as any).phone ?? null,
      role: normalizedRole as SystemRole,
      leader_id: (profile as any).leader_id ?? null,
      student_status: profile.student_status as any,
      status: ((profile as any).status ?? "active") as SystemStatus
    }
  };
}

export async function requireSystemUser() {
  const ctx = await getSystemContext();
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireSystemUser();
  if (!isAdminRole(ctx.user.role)) throw err("FORBIDDEN");
  return ctx;
}

export async function requireManager() {
  const ctx = await requireSystemUser();
  if (!isAdminRole(ctx.user.role) && ctx.user.role !== "coach" && ctx.user.role !== "assistant") {
    throw err("FORBIDDEN");
  }
  return ctx;
}

export async function requireStudent() {
  const ctx = await requireSystemUser();
  if (!isLearnerRole(ctx.user.role)) throw err("FORBIDDEN");
  return ctx;
}

export async function requireLearner() {
  const ctx = await requireSystemUser();
  if (!isLearnerRole(ctx.user.role) && ctx.user.role !== "leader") throw err("FORBIDDEN");
  return ctx;
}

export async function requireSuperAdmin() {
  const ctx = await requireSystemUser();
  if (!isSuperAdmin(ctx.user.role)) throw err("FORBIDDEN");
  return ctx;
}
