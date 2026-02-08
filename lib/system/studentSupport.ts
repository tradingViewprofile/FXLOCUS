export type StudentSupportInfo = {
  assistantName: string | null;
  coachName: string | null;
  displayName: string | null;
};

function formatName(row: any) {
  if (!row) return null;
  const name = String(row.full_name || "").trim();
  if (name) return name;
  const email = String(row.email || "").trim();
  if (email) return email;
  const id = String(row.id || "").trim();
  return id ? id.slice(0, 6) : null;
}

export async function fetchStudentSupportNames(
  supabase: any,
  studentIds: string[]
): Promise<Map<string, StudentSupportInfo>> {
  const uniqueIds = Array.from(new Set(studentIds.filter(Boolean)));
  const result = new Map<string, StudentSupportInfo>();
  if (!uniqueIds.length) return result;

  const { data: students, error: studentsErr } = await supabase
    .from("profiles")
    .select("id,created_by,leader_id")
    .in("id", uniqueIds);
  if (studentsErr) throw new Error(studentsErr.message || "STUDENT_SUPPORT_QUERY_FAILED");

  const createdByIds = Array.from(
    new Set((students || []).map((row: any) => String(row.created_by || "")).filter(Boolean))
  );
  const leaderIds = Array.from(
    new Set((students || []).map((row: any) => String(row.leader_id || "")).filter(Boolean))
  );

  const supportIds = Array.from(new Set([...createdByIds, ...leaderIds]));

  const { data: assistants, error: assistantErr } = supportIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email,role,status")
        .in("id", supportIds)
    : ({ data: [], error: null } as any);
  if (assistantErr) throw new Error(assistantErr.message || "ASSISTANT_SUPPORT_QUERY_FAILED");

  const assistantById = new Map<string, string>();
  const leaderById = new Map<string, string>();
  const superAdminById = new Map<string, string>();
  (assistants || []).forEach((row: any) => {
    const role = String(row.role || "");
    const label = formatName(row);
    if (!label) return;
    if (role === "assistant") assistantById.set(String(row.id), label);
    if (role === "leader" || role === "super_admin") leaderById.set(String(row.id), label);
    if (role === "super_admin") superAdminById.set(String(row.id), label);
  });

  let defaultSuperAdmin: string | null = superAdminById.size
    ? Array.from(superAdminById.values())[0]
    : null;
  if (!defaultSuperAdmin) {
    const { data: admins, error: adminErr } = await supabase
      .from("profiles")
      .select("id,full_name,email,role")
      .eq("role", "super_admin")
      .limit(1);
    if (!adminErr && admins?.length) {
      defaultSuperAdmin = formatName(admins[0]);
    }
  }

  const { data: coachAssignments, error: coachAssignErr } = await supabase
    .from("coach_assignments")
    .select("assigned_user_id,coach_id")
    .in("assigned_user_id", uniqueIds);
  if (coachAssignErr) throw new Error(coachAssignErr.message || "COACH_SUPPORT_QUERY_FAILED");

  const coachIds = Array.from(
    new Set((coachAssignments || []).map((row: any) => String(row.coach_id || "")).filter(Boolean))
  );

  const { data: coaches, error: coachErr } = coachIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name,email,role,status")
        .in("id", coachIds)
    : ({ data: [], error: null } as any);
  if (coachErr) throw new Error(coachErr.message || "COACH_SUPPORT_QUERY_FAILED");

  const coachById = new Map<string, string>();
  (coaches || []).forEach((row: any) => {
    const label = formatName(row);
    if (!label) return;
    coachById.set(String(row.id), label);
  });

  const coachByStudent = new Map<string, string>();
  (coachAssignments || []).forEach((row: any) => {
    const studentId = String(row.assigned_user_id || "");
    const coachId = String(row.coach_id || "");
    if (studentId && coachId && !coachByStudent.has(studentId)) coachByStudent.set(studentId, coachId);
  });

  (students || []).forEach((row: any) => {
    const studentId = String(row.id || "");
    if (!studentId) return;
    const assistantId = String(row.created_by || "");
    const assistantName = assistantId ? assistantById.get(assistantId) || null : null;
    const leaderId = String(row.leader_id || "");
    const leaderName = leaderId ? leaderById.get(leaderId) || null : null;
    const coachId = coachByStudent.get(studentId);
    const coachName = coachId ? coachById.get(coachId) || null : null;
    const createdByLeader =
      assistantId && (leaderById.get(assistantId) || superAdminById.get(assistantId) || null);
    const superAdminName = assistantId ? superAdminById.get(assistantId) || null : null;
    const resolvedLeaderName = leaderName || createdByLeader || null;
    const resolvedCoachName = coachName || null;
    result.set(studentId, {
      assistantName,
      coachName: resolvedCoachName,
      displayName:
        assistantName ||
        resolvedCoachName ||
        resolvedLeaderName ||
        superAdminName ||
        defaultSuperAdmin ||
        null
    });
  });

  return result;
}
