import "server-only";

import { unstable_cache } from "next/cache";

import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

type RoleRow = { id: string; role: string | null };

async function fetchRolesByProfileIds(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids.map(String).filter(Boolean)));
  const out = new Map<string, string>();
  if (!uniqueIds.length) return out;

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("profiles").select("id,role").in("id", uniqueIds);
  if (error) return out;

  (data as RoleRow[] | null | undefined)?.forEach((row) => {
    if (!row?.id) return;
    out.set(String(row.id), String(row.role || ""));
  });
  return out;
}

// Cache RBAC lookups: role assignments rarely change, but are queried frequently by system dashboards.
export const getRolesByProfileIds = unstable_cache(fetchRolesByProfileIds, ["fxlocus", "rbac", "profile-roles"], {
  revalidate: 3600
});

