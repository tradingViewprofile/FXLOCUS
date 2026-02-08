export async function fetchAssistantCreatedUserIds(
  supabase: any,
  assistantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("created_by", assistantId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message || "ASSISTANT_SCOPE_QUERY_FAILED");
  return (data || []).map((row: any) => String(row.id || "")).filter(Boolean);
}
