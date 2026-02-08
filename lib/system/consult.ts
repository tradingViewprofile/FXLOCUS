import type { SystemUserSafe } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { fetchStudentSupportNames } from "@/lib/system/studentSupport";

const CONTACTABLE_ROLES = ["student", "trader", "coach", "assistant", "leader"] as const;
const LEARNER_ROLES = ["student", "trader", "coach"] as const;

export type ConsultRecipient = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  avatar_url: string | null;
  support_name?: string | null;
};

type SystemContext = {
  user: SystemUserSafe;
  supabase: any;
};

function normalizeRecipient(row: any): ConsultRecipient {
  return {
    id: String(row.id),
    full_name: row.full_name ?? null,
    email: row.email ?? null,
    role: row.role ?? null,
    avatar_url: row.avatar_url ?? null
  };
}

function roleRank(role: string | null) {
  if (role === "super_admin") return 0;
  if (role === "leader") return 1;
  if (role === "coach") return 2;
  if (role === "assistant") return 3;
  if (role === "trader") return 4;
  if (role === "student") return 5;
  return 9;
}

async function fetchProfilesByIds(
  admin: ReturnType<typeof supabaseAdmin>,
  ids: string[]
) {
  if (!ids.length) return [];
  const { data, error } = await admin
    .from("profiles")
    .select("id,full_name,email,role,avatar_url,created_at")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message || "RECIPIENTS_QUERY_FAILED");
  return (data || []).map(normalizeRecipient);
}

async function fetchSuperAdmins(admin: ReturnType<typeof supabaseAdmin>) {
  const { data, error } = await admin
    .from("profiles")
    .select("id,full_name,email,role,avatar_url,created_at")
    .eq("role", "super_admin")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message || "SUPER_ADMIN_QUERY_FAILED");
  return (data || []).map(normalizeRecipient);
}

export async function listConsultRecipients(ctx: SystemContext): Promise<ConsultRecipient[]> {
  const admin = supabaseAdmin();
  const user = ctx.user;
  const unique = new Map<string, ConsultRecipient>();

  if (user.role === "super_admin") {
    const { data, error } = await admin
      .from("profiles")
      .select("id,full_name,email,role,avatar_url,created_at")
      .in("role", CONTACTABLE_ROLES as unknown as string[])
      .order("created_at", { ascending: false })
    .limit(1000);
    if (error) throw new Error(error.message || "RECIPIENTS_QUERY_FAILED");
    (data || []).forEach((row: any) => {
      if (!row?.id || row.id === user.id) return;
      unique.set(String(row.id), normalizeRecipient(row));
    });
  } else if (user.role === "leader") {
    const treeIds = await fetchLeaderTreeIds(ctx.supabase, user.id);
    const ids = treeIds.filter((id) => id && id !== user.id);
    const rows = await fetchProfilesByIds(admin, ids);
    rows.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
    const supers = await fetchSuperAdmins(admin);
    supers.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
  } else if (user.role === "coach") {
    const { data: assigned, error: assignedErr } = await admin
      .from("coach_assignments")
      .select("assigned_user_id")
      .eq("coach_id", user.id);
    if (assignedErr) throw new Error(assignedErr.message || "COACH_ASSIGN_QUERY_FAILED");
    const ids = new Set<string>();
    (assigned || []).forEach((row: any) => {
      if (row?.assigned_user_id) ids.add(String(row.assigned_user_id));
    });
    if (user.leader_id) ids.add(user.leader_id);
    const rows = await fetchProfilesByIds(admin, Array.from(ids));
    rows.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
    const supers = await fetchSuperAdmins(admin);
    supers.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
  } else if (user.role === "assistant") {
    const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
    const rows = await fetchProfilesByIds(admin, createdIds);
    rows.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
    if (user.leader_id) {
      const leaders = await fetchProfilesByIds(admin, [user.leader_id]);
      leaders.forEach((row: ConsultRecipient) => {
        if (row.id === user.id) return;
        unique.set(row.id, row);
      });
    }
    const supers = await fetchSuperAdmins(admin);
    supers.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
  } else {
    const ids = new Set<string>();
    if (user.leader_id) ids.add(user.leader_id);
    const { data: selfRow } = await admin
      .from("profiles")
      .select("created_by")
      .eq("id", user.id)
      .maybeSingle();
    if (selfRow?.created_by) ids.add(String(selfRow.created_by));
    const { data: coaches, error: coachErr } = await admin
      .from("coach_assignments")
      .select("coach_id")
      .eq("assigned_user_id", user.id);
    if (coachErr) throw new Error(coachErr.message || "COACH_ASSIGN_QUERY_FAILED");
    (coaches || []).forEach((row: any) => {
      if (row?.coach_id) ids.add(String(row.coach_id));
    });
    const rows = await fetchProfilesByIds(admin, Array.from(ids));
    rows.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
    const supers = await fetchSuperAdmins(admin);
    supers.forEach((row: ConsultRecipient) => {
      if (row.id === user.id) return;
      unique.set(row.id, row);
    });
  }

  const recipients = Array.from(unique.values());
  if (user.role === "super_admin" || user.role === "leader") {
    const targetIds = recipients
      .filter((item) => item.role === "student" || item.role === "trader")
      .map((item) => item.id);
    if (targetIds.length) {
      const supportMap = await fetchStudentSupportNames(admin, targetIds);
      recipients.forEach((item) => {
        const support = supportMap.get(item.id);
        if (support?.displayName) item.support_name = support.displayName;
      });
    }
  }

  return recipients.sort((a, b) => {
    const byRole = roleRank(a.role) - roleRank(b.role);
    if (byRole !== 0) return byRole;
    const nameA = (a.full_name || a.email || "").toLowerCase();
    const nameB = (b.full_name || b.email || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

export async function canConsultWith(ctx: SystemContext, targetId: string): Promise<boolean> {
  const user = ctx.user;
  if (!targetId || targetId === user.id) return false;

  const admin = supabaseAdmin();
  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id,role")
    .eq("id", targetId)
    .maybeSingle();
  if (targetErr || !target?.id) return false;
  const targetRole = String(target.role || "");

  if (user.role === "super_admin") {
    return CONTACTABLE_ROLES.includes(targetRole as any);
  }

  if (targetRole === "super_admin") return true;

  if (user.role === "leader") {
    const treeIds = await fetchLeaderTreeIds(ctx.supabase, user.id);
    return treeIds.includes(targetId) && targetId !== user.id;
  }

  if (user.role === "coach") {
    if (user.leader_id && targetId === user.leader_id) return true;
    const { data: assigned, error: assignedErr } = await admin
      .from("coach_assignments")
      .select("assigned_user_id")
      .eq("coach_id", user.id);
    if (assignedErr) return false;
    return (assigned || []).some((row: any) => String(row.assigned_user_id || "") === targetId);
  }

  if (user.role === "assistant") {
    if (user.leader_id && targetId === user.leader_id) return true;
    const { data: created, error: createdErr } = await admin
      .from("profiles")
      .select("id")
      .eq("created_by", user.id)
      .eq("id", targetId)
      .maybeSingle();
    if (createdErr) return false;
    return Boolean(created?.id);
  }

  if (user.leader_id && targetId === user.leader_id) return true;
  const { data: selfRow } = await admin
    .from("profiles")
    .select("created_by")
    .eq("id", user.id)
    .maybeSingle();
  if (selfRow?.created_by && String(selfRow.created_by) === targetId) return true;
  const { data: coaches, error: coachErr } = await admin
    .from("coach_assignments")
    .select("coach_id")
    .eq("assigned_user_id", user.id);
  if (coachErr) return false;
  return (coaches || []).some((row: any) => String(row.coach_id || "") === targetId);
}
