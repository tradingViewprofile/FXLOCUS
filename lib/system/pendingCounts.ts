import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { getRolesByProfileIds } from "@/lib/system/rbacRoleCache";

type PendingCounts = {
  courseAccess: number;
  fileAccess: number;
  tradeLogs: number;
  tradeStrategies: number;
  classicTrades: number;
  weeklySummaries: number;
  weeklySummariesStudent: number;
  weeklySummariesAssistant: number;
  weeklySummariesLeader: number;
  courseSummaries: number;
  ladderRequests: number;
  studentDocuments: number;
  enrollments: number;
  contacts: number;
  donations: number;
};

const CACHE_TTL_MS = 20_000;
const g = globalThis as {
  __fx_pending_counts_cache?: Map<string, { exp: number; value: { counts: PendingCounts; warnings?: string[] } }>;
};
if (!g.__fx_pending_counts_cache) g.__fx_pending_counts_cache = new Map();
const pendingCache = g.__fx_pending_counts_cache;

export async function getPendingCounts({
  user,
  admin
}: {
  user: { id: string; role: string };
  admin: any;
}): Promise<{ counts: PendingCounts; warnings?: string[] }> {
  const cacheKey = `${user.id}:${user.role}`;
  const cached = pendingCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.value;
  }
  const db = admin;
  const counts: PendingCounts = {
    courseAccess: 0,
    fileAccess: 0,
    tradeLogs: 0,
    tradeStrategies: 0,
    classicTrades: 0,
    weeklySummaries: 0,
    weeklySummariesStudent: 0,
    weeklySummariesAssistant: 0,
    weeklySummariesLeader: 0,
    courseSummaries: 0,
    ladderRequests: 0,
    studentDocuments: 0,
    enrollments: 0,
    contacts: 0,
    donations: 0
  };

  const warnings: string[] = [];
  const normalizeError = (err: any) => {
    const message =
      String(err?.message || err?.error_description || err?.hint || err?.code || "").trim() ||
      "query_failed";
    return message;
  };
  const shouldIgnore = (err: any) => {
    const msg = normalizeError(err).toLowerCase();
    return msg.includes("does not exist") || msg.includes("schema cache");
  };

  let scopeIds: string[] | null = null;
  try {
    scopeIds =
      user.role === "leader"
        ? await fetchLeaderTreeIds(admin, user.id)
        : user.role === "coach"
          ? await fetchCoachAssignedUserIds(admin, user.id)
          : user.role === "assistant"
            ? await fetchAssistantCreatedUserIds(admin, user.id)
            : null;
  } catch (err: any) {
    warnings.push(`scope:${normalizeError(err)}`);
    scopeIds = null;
  }

  if (scopeIds && !scopeIds.length) return { counts, warnings: warnings.length ? warnings : undefined };

  const scopeFilter = (query: any) =>
    scopeIds && scopeIds.length ? query.in("user_id", scopeIds) : query;

  const scopeFilterStudent = (query: any) =>
    scopeIds && scopeIds.length ? query.in("student_id", scopeIds) : query;

  const filterUserIdsByRole = async (ids: string[], roles: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return new Set<string>();
    const roleSet = new Set(roles);
    const roleMap = await getRolesByProfileIds(uniqueIds);
    const allowed = new Set<string>();
    uniqueIds.forEach((id) => {
      const role = roleMap.get(String(id)) || "";
      if (roleSet.has(role)) allowed.add(String(id));
    });
    return allowed;
  };

  const courseAccessCount = async () => {
    const res = await db
      .from("course_access")
      .select("user_id,status")
      .eq("status", "requested");
    if (res.error) {
      if (!shouldIgnore(res.error)) warnings.push(`course_access:${normalizeError(res.error)}`);
      return 0;
    }
    let rows = res.data || [];
    if (scopeIds && scopeIds.length) {
      const scopeSet = new Set(scopeIds);
      rows = rows.filter((row: any) => scopeSet.has(String(row.user_id || "")));
    }
    const userIds = rows.map((row: any) => String(row.user_id || "")).filter(Boolean);
    const allowed = await filterUserIdsByRole(userIds, ["student", "trader", "coach"]);
    return rows.filter((row: any) => allowed.has(String(row.user_id))).length;
  };

  const fileAccessCount = async () => {
    const res = await db
      .from("file_access_requests")
      .select("user_id,status")
      .eq("status", "requested");
    if (res.error) {
      if (!shouldIgnore(res.error)) warnings.push(`file_access:${normalizeError(res.error)}`);
      return 0;
    }
    let rows = res.data || [];
    if (scopeIds && scopeIds.length) {
      const scopeSet = new Set(scopeIds);
      rows = rows.filter((row: any) => scopeSet.has(String(row.user_id || "")));
    }
    const userIds = rows.map((row: any) => String(row.user_id || "")).filter(Boolean);
    const allowed = await filterUserIdsByRole(userIds, ["student", "trader", "coach", "leader"]);
    return rows.filter((row: any) => allowed.has(String(row.user_id))).length;
  };

  const [
    tradeLogsRes,
    tradeStrategiesRes,
    classicTradesRes,
    weeklyRes,
    courseNotesRes,
    ladderRes,
    studentDocsRes,
    enrollmentRes,
    donateRes
  ] = await Promise.all([
    scopeFilter(
      db
        .from("trade_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .eq("type", "trade_log")
        .is("archived_at", null)
    ),
    scopeFilter(
      db
        .from("trade_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .eq("type", "trade_strategy")
        .is("archived_at", null)
    ),
    scopeFilter(
      db
        .from("classic_trades")
        .select("id", { count: "exact", head: true })
        .is("reviewed_at", null)
    ),
    scopeFilter(
      db
        .from("weekly_summaries")
        .select("user_id", { count: "exact" })
        .is("reviewed_at", null)
        .limit(2000)
    ),
    scopeFilter(
      db
        .from("course_notes")
        .select("id", { count: "exact", head: true })
        .is("reviewed_at", null)
        .not("submitted_at", "is", null)
    ),
    scopeFilter(
      db
        .from("ladder_authorizations")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "requested")
    ),
    scopeFilterStudent(
      db
        .from("student_documents")
        .select("student_id,reviewed_at,created_at")
        .order("created_at", { ascending: false })
        .limit(500)
    ),
    user.role === "super_admin"
      ? admin.from("records").select("id", { count: "exact", head: true }).eq("type", "enrollment")
      : ({ count: 0, error: null } as any),
    user.role === "super_admin"
      ? admin.from("records").select("id", { count: "exact", head: true }).eq("type", "donate")
      : ({ count: 0, error: null } as any)
  ]);

  let resolvedStudentDocsRes: any = studentDocsRes;
  if (studentDocsRes?.error?.code === "42703") {
    resolvedStudentDocsRes = await scopeFilterStudent(
      db
        .from("student_documents")
        .select("student_id,created_at")
        .order("created_at", { ascending: false })
        .limit(500)
    );
  }

  if (tradeLogsRes.error && !shouldIgnore(tradeLogsRes.error)) warnings.push(`trade_logs:${normalizeError(tradeLogsRes.error)}`);
  if (tradeStrategiesRes.error && !shouldIgnore(tradeStrategiesRes.error)) warnings.push(`trade_strategies:${normalizeError(tradeStrategiesRes.error)}`);
  if (classicTradesRes.error && !shouldIgnore(classicTradesRes.error)) warnings.push(`classic_trades:${normalizeError(classicTradesRes.error)}`);
  if (weeklyRes.error && !shouldIgnore(weeklyRes.error)) warnings.push(`weekly_summaries:${normalizeError(weeklyRes.error)}`);
  if (courseNotesRes.error && !shouldIgnore(courseNotesRes.error)) warnings.push(`course_notes:${normalizeError(courseNotesRes.error)}`);
  if (ladderRes.error && !shouldIgnore(ladderRes.error)) warnings.push(`ladder_requests:${normalizeError(ladderRes.error)}`);
  if (resolvedStudentDocsRes.error && !shouldIgnore(resolvedStudentDocsRes.error))
    warnings.push(`student_documents:${normalizeError(resolvedStudentDocsRes.error)}`);
  if (enrollmentRes?.error && !shouldIgnore(enrollmentRes.error)) warnings.push(`enrollments:${normalizeError(enrollmentRes.error)}`);
  if (donateRes?.error && !shouldIgnore(donateRes.error)) warnings.push(`donations:${normalizeError(donateRes.error)}`);

  let contactRes: any = { count: 0, error: null };
  if (user.role === "super_admin") {
    const contactPrimary: any = await admin
      .from("records")
      .select("id,read_at,payload,content")
      .eq("type", "contact")
      .order("created_at", { ascending: false })
      .limit(2000);
    const contactFallback: any =
      contactPrimary.error?.code === "42703"
        ? await admin
            .from("records")
            .select("id,payload,content")
            .eq("type", "contact")
            .order("created_at", { ascending: false })
            .limit(2000)
        : null;
    const contactQuery: any = contactFallback || contactPrimary;
    if (contactQuery?.error) {
      contactRes = contactQuery;
    } else {
      const rows = contactQuery?.data || [];
      const unread = rows.filter((row: any) => {
        if (row?.read_at) return false;
        const payload = row?.payload;
        if (payload && typeof payload === "object") {
          return !(payload as any).read_at && !(payload as any).readAt;
        }
        if (typeof row?.content === "string") {
          try {
            const parsed = JSON.parse(row.content);
            return !parsed?.read_at && !parsed?.readAt;
          } catch {
            return true;
          }
        }
        return true;
      }).length;
      contactRes = { count: unread, error: null };
    }
  }
  if (contactRes?.error && !shouldIgnore(contactRes.error)) warnings.push(`contacts:${normalizeError(contactRes.error)}`);

  counts.courseAccess = await courseAccessCount();
  counts.fileAccess = await fileAccessCount();
  counts.tradeLogs = tradeLogsRes.error ? 0 : Number(tradeLogsRes.count || 0);
  counts.tradeStrategies = tradeStrategiesRes.error ? 0 : Number(tradeStrategiesRes.count || 0);
  counts.classicTrades = classicTradesRes.error ? 0 : Number(classicTradesRes.count || 0);
  counts.weeklySummaries = weeklyRes.error ? 0 : Number(weeklyRes.count || 0);
  if (!weeklyRes.error) {
    const weeklyRows = weeklyRes.data || [];
    const userIds = weeklyRows.map((row: any) => String(row.user_id || "")).filter(Boolean);
    const uniqueIds = Array.from(new Set(userIds));
    const roleMap = new Map<string, string>();
    if (uniqueIds.length) {
      const { data, error } = await db.from("profiles").select("id,role").in("id", uniqueIds);
      if (error) {
        if (!shouldIgnore(error)) warnings.push(`weekly_profiles:${normalizeError(error)}`);
      } else {
        (data || []).forEach((row: any) => {
          roleMap.set(String(row.id), String(row.role || ""));
        });
      }
    }

    weeklyRows.forEach((row: any) => {
      const role = roleMap.get(String(row.user_id || "")) || "";
      if (role === "assistant") counts.weeklySummariesAssistant += 1;
      else if (role === "leader") counts.weeklySummariesLeader += 1;
      else if (role === "student" || role === "trader") counts.weeklySummariesStudent += 1;
    });
  }
  counts.courseSummaries = courseNotesRes.error ? 0 : Number(courseNotesRes.count || 0);
  counts.ladderRequests = ladderRes.error ? 0 : Number(ladderRes.count || 0);
  if (!resolvedStudentDocsRes.error) {
    const rows = resolvedStudentDocsRes.data || [];
    const grouped = new Map<string, { reviewed: boolean }>();
    rows.forEach((row: any) => {
      const studentId = String(row.student_id || "");
      if (!studentId) return;
      const reviewedAt = row?.reviewed_at;
      const reviewed = reviewedAt ? true : false;
      const prev = grouped.get(studentId);
      if (!prev) {
        grouped.set(studentId, { reviewed });
        return;
      }
      if (!reviewed) prev.reviewed = false;
    });
    counts.studentDocuments = Array.from(grouped.values()).filter((item) => !item.reviewed).length;
  } else {
    counts.studentDocuments = 0;
  }
  counts.enrollments = enrollmentRes?.error ? 0 : Number(enrollmentRes?.count || 0);
  counts.contacts = contactRes?.error ? 0 : Number(contactRes?.count || 0);
  counts.donations = donateRes?.error ? 0 : Number(donateRes?.count || 0);

  const result = { counts, warnings: warnings.length ? warnings : undefined };
  pendingCache.set(cacheKey, { exp: Date.now() + CACHE_TTL_MS, value: result });
  return result;
}
