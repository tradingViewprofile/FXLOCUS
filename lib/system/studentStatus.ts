

const NORMAL_STATUS = "普通学�?;
const LEARNING_STATUS = "学习�?;
const OPEN_STATUSES = ["approved", "completed"] as const;

export async function ensureLearningStatus(
  admin: any,
  userId: string
): Promise<boolean> {
  if (!userId) return false;
  const { count, error } = await admin
    .from("course_access")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", OPEN_STATUSES as unknown as string[]);
  if (error) throw new Error(error.message || "COURSE_ACCESS_COUNT_FAILED");
  if ((count || 0) < 2) return false;

  const { data, error: upErr } = await admin
    .from("profiles")
    .update({ student_status: LEARNING_STATUS, updated_at: new Date().toISOString() } as any)
    .eq("id", userId)
    .eq("student_status", NORMAL_STATUS)
    .select("id")
    .maybeSingle();

  if (upErr) throw new Error(upErr.message || "STUDENT_STATUS_UPDATE_FAILED");
  return Boolean(data?.id);
}
