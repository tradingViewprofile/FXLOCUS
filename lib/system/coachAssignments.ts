export async function fetchCoachAssignedUserIds(
  supabase: any,
  coachId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("coach_assignments")
    .select("assigned_user_id")
    .eq("coach_id", coachId);
  if (error) throw new Error(error.message || "COACH_ASSIGNMENTS_QUERY_FAILED");
  return (data || []).map((row: any) => String(row.assigned_user_id || "")).filter(Boolean);
}

export async function fetchCoachAssignedUserSet(
  supabase: any,
  coachId: string
): Promise<Set<string>> {
  const ids = await fetchCoachAssignedUserIds(supabase, coachId);
  return new Set(ids);
}
