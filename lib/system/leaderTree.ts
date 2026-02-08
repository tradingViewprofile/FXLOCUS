export async function fetchLeaderTreeIds(supabase: any, leaderId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("leader_tree_ids", { root_id: leaderId });
  if (error) throw new Error(error.message || "TREE_QUERY_FAILED");
  const rows = (data || []) as any[];
  return rows.map((row) => String(row?.id ?? row ?? "")).filter(Boolean);
}
