"use client";

import React from "react";
import { Copy } from "lucide-react";

import type { SystemRole } from "@/lib/system/roles";

import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { EChart } from "@/components/system/charts/EChart";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type AccessRow = {
  id: string;
  course_id: number;
  status: string;
  progress: number;
  requested_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

type FilePermissionRow = {
  file_id: string;
  created_at?: string | null;
  files?: { id: string; name?: string | null; category?: string | null } | null;
};

type LadderRow = {
  user_id: string;
  status: string;
  enabled: boolean;
  requested_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

const SOURCE_OPTIONS = [
  { value: "boss", zh: "boss", en: "boss" },
  { value: "商业化", zh: "商业化", en: "Commercial" },
  { value: "其他渠道", zh: "其他渠道", en: "Other" }
] as const;

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: SystemRole;
  status: "active" | "frozen";
  student_status?: "普通学员" | "考核通过" | "学习中" | "捐赠学员" | "考核通过+捐赠学员";
  leader_id: string | null;
  source?: string | null;
  created_at?: string;
  last_login_at?: string | null;
};

type TeamSummary = { total: number; frozen: number; byStatus: Record<string, number> };
type TeamStudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "frozen";
  student_status: "普通学员" | "考核通过" | "学习中" | "捐赠学员" | "考核通过+捐赠学员";
  created_at?: string | null;
  last_login_at?: string | null;
};
type TeamLeaderSummary = { total: number; active: number; frozen: number };
type TeamLeaderRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "frozen";
  created_at?: string | null;
  last_login_at?: string | null;
};

function teamStatusChart(locale: "zh" | "en", byStatus: Record<string, number>) {
  const labels = Object.keys(byStatus);
  const values = labels.map((k) => Number(byStatus[k] || 0));
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 16, right: 16, top: 48, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: "rgba(255,255,255,0.65)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } }
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      axisLabel: { color: "rgba(255,255,255,0.65)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
      axisTick: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }
    },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: { borderRadius: [8, 8, 0, 0], color: "#38bdf8" }
      }
    ],
    title: {
      text: locale === "zh" ? "团队学员状态统计" : "Team student status",
      left: "center",
      top: 12,
      textStyle: { color: "rgba(255,255,255,0.85)", fontSize: 14 }
    }
  };
}

function leaderStatusChart(locale: "zh" | "en", summary: TeamLeaderSummary) {
  const labels = [locale === "zh" ? "正常" : "Active", locale === "zh" ? "冻结" : "Frozen"];
  const values = [Number(summary.active || 0), Number(summary.frozen || 0)];
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 16, right: 16, top: 48, bottom: 24, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: "rgba(255,255,255,0.65)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } }
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      axisLabel: { color: "rgba(255,255,255,0.65)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
      axisTick: { lineStyle: { color: "rgba(255,255,255,0.2)" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } }
    },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: { borderRadius: [8, 8, 0, 0], color: "#f59e0b" }
      }
    ],
    title: {
      text: locale === "zh" ? "下属团队长状态" : "Sub-leader status",
      left: "center",
      top: 12,
      textStyle: { color: "rgba(255,255,255,0.85)", fontSize: 14 }
    }
  };
}

export function AdminStudentDetailClient({
  locale,
  userId
}: {
  locale: "zh" | "en";
  userId: string;
}) {
  const [meRole, setMeRole] = React.useState<"leader" | "super_admin" | "assistant" | null>(null);
  const [user, setUser] = React.useState<UserRow | null>(null);
  const [access, setAccess] = React.useState<AccessRow[]>([]);
  const [filePermissions, setFilePermissions] = React.useState<FilePermissionRow[]>([]);
  const [ladder, setLadder] = React.useState<LadderRow | null>(null);
  const [team, setTeam] = React.useState<{
    students: TeamStudentRow[];
    summary: TeamSummary;
    leaders: TeamLeaderRow[];
    leaderSummary: TeamLeaderSummary;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resetPw, setResetPw] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState({ title: "", content: "" });
  const [busy, setBusy] = React.useState(false);
  const [customPassword, setCustomPassword] = React.useState("");
  const isAssistant = meRole === "assistant";
  const canManage = meRole === "super_admin" || meRole === "leader";

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        const role = json?.ok ? String(json?.user?.role || "") : "";
        if (role === "super_admin") setMeRole("super_admin");
        else if (role === "leader") setMeRole("leader");
        else if (role === "assistant") setMeRole("assistant");
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/system/admin/students/${userId}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setUser(json.user || null);
      setAccess(Array.isArray(json.access) ? json.access : []);
      setFilePermissions(Array.isArray(json.filePermissions) ? json.filePermissions : []);
      setLadder(json.ladder || null);
      setTeam(json.team || null);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    load();
  }, [load]);

  useSystemRealtimeRefresh(load);

  const toggleStatus = async () => {
    if (!user) return;
    const ok = window.confirm(
      locale === "zh"
        ? user.status === "active"
          ? "确认冻结该账号？"
          : "确认解冻该账号？"
        : user.status === "active"
          ? "Freeze this account?"
          : "Unfreeze this account?"
    );
    if (!ok) return;
    setBusy(true);
    try {
      const next = user.status === "active" ? "frozen" : "active";
      await fetch(`/api/system/admin/students/${user.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!user || !canManage) return;
    const ok = window.confirm(locale === "zh" ? "确认重置该账号密码？" : "Reset this user's password?");
    if (!ok) return;
    setBusy(true);
    setResetPw(null);
    setError(null);
    try {
      if (customPassword && !isStrongSystemPassword(customPassword)) {
        throw new Error(locale === "zh" ? "新密码强度不足" : "Weak password");
      }

      const res = await fetch(`/api/system/admin/students/${user.id}/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(customPassword ? { newPassword: customPassword } : {})
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "reset_failed");
      setResetPw(String(json.newPassword || ""));
      setCustomPassword("");
      await load();
    } catch (e: any) {
      setError(e?.message || "reset_failed");
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!user) return;
    if (!msg.content.trim()) return;
    const ok = window.confirm(locale === "zh" ? "确认发送通知给该学员？" : "Send this notification?");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/system/admin/students/${user.id}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: msg.title || undefined, content: msg.content })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "send_failed");
      setMsg({ title: "", content: "" });
    } catch (e: any) {
      setError(e?.message || "send_failed");
    } finally {
      setBusy(false);
    }
  };

  const approveAll = async () => {
    if (!user) return;
    const targets = access.filter((item) => item.status === "requested");
    if (!targets.length) return;
    const ok = window.confirm(locale === "zh" ? "确认通过该学员全部课程申请？" : "Approve all requests?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/courses/review-bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: targets.map((item) => ({ userId: user.id, courseId: item.course_id })),
          action: "approve"
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy(false);
    }
  };

  const updateCourseAccess = async (courseId: number, action: "approve" | "reject") => {
    if (!user) return;
    const ok = window.confirm(
      locale === "zh"
        ? action === "approve"
          ? `确认开通第 ${courseId} 课？`
          : `确认关闭第 ${courseId} 课？`
        : action === "approve"
          ? `Approve course #${courseId}?`
          : `Revoke course #${courseId}?`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/courses/review-bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [{ userId: user.id, courseId }],
          action,
          reason: action === "reject" ? "其他" : undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy(false);
    }
  };

  const updateSource = async (next: string) => {
    if (!user) return;
    const ok = window.confirm(locale === "zh" ? "确认修改来源？" : "Update source?");
    if (!ok) {
      await load();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/system/admin/students/${user.id}/source`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: next || null })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy(false);
    }
  };

  const revokeFilePermission = async (fileId: string) => {
    if (!user) return;
    const ok = window.confirm(locale === "zh" ? "确认关闭该文件权限？" : "Revoke file access?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/files/revoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId, userId: user.id })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleLadder = async (action: "approve" | "reject") => {
    if (!user) return;
    const ok = window.confirm(
      locale === "zh"
        ? action === "approve"
          ? "确认开通天梯权限？"
          : "确认关闭天梯权限？"
        : action === "approve"
          ? "Approve ladder access?"
          : "Revoke ladder access?"
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/ladder/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action,
          reason: action === "reject" ? (locale === "zh" ? "关闭权限" : "Revoked") : undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteStudent = async () => {
    if (!user || !canManage) return;
    const ok = window.confirm(
      locale === "zh" ? "确认删除该学员？此操作不可恢复。" : "Delete this student? This cannot be undone."
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/students/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "delete_failed");
      window.location.href = `/${locale}/system/admin/students`;
    } catch (e: any) {
      setError(e?.message || "delete_failed");
    } finally {
      setBusy(false);
    }
  };

  const canHardDelete = meRole === "super_admin" || meRole === "leader";

  const hardDeleteStudent = async () => {
    if (!user || !canHardDelete) return;
    const ok = window.confirm(
      locale === "zh"
        ? "确认永久删除该账号及所有关联数据？"
        : "Permanently delete this account and all related data?"
    );
    if (!ok) return;
    const ok2 = window.confirm(
      locale === "zh" ? "二次确认：此操作不可恢复，仍要继续？" : "Final confirmation: this cannot be undone. Continue?"
    );
    if (!ok2) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/students/hard-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, confirm: "HARD_DELETE" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "hard_delete_failed");
      window.location.href = `/${locale}/system/admin/students`;
    } catch (e: any) {
      setError(e?.message || "hard_delete_failed");
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      if (!value) return;
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };

  const field = (label: string, value?: React.ReactNode, copyValue?: string | null) => {
    const display =
      value === null || value === undefined || (typeof value === "string" && value.trim() === "")
        ? "-"
        : value;
    const canCopy = Boolean(copyValue && String(copyValue).trim());
    return (
      <div className="text-xs text-white/50 flex items-center gap-2">
        <span>
          {label}: <span className="text-white/80">{display}</span>
        </span>
        {canCopy ? (
          <button
            type="button"
            onClick={() => copyToClipboard(String(copyValue))}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            title={locale === "zh" ? "复制" : "Copy"}
            aria-label={locale === "zh" ? "复制" : "Copy"}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  };

  const isLeader = user?.role === "leader";
  const studentStatusOptions = ["考核通过", "捐赠学员", "考核通过+捐赠学员"];
  const statusValue =
    user && studentStatusOptions.includes(user.student_status as any) ? user.student_status : "";
  const teamChart = React.useMemo(
    () => (team?.summary ? teamStatusChart(locale, team.summary.byStatus) : null),
    [locale, team?.summary]
  );
  const leaderChart = React.useMemo(
    () => (team?.leaderSummary ? leaderStatusChart(locale, team.leaderSummary) : null),
    [locale, team?.leaderSummary]
  );

  const teamStudents = team?.students ?? [];
  const teamLeaders = team?.leaders ?? [];
  const {
    pageItems: teamStudentItems,
    page: teamStudentPage,
    pageSize: teamStudentPageSize,
    setPage: setTeamStudentPage,
    setPageSize: setTeamStudentPageSize,
    pageCount: teamStudentPageCount,
    total: teamStudentTotal
  } = usePagination(teamStudents);
  const {
    pageItems: teamLeaderItems,
    page: teamLeaderPage,
    pageSize: teamLeaderPageSize,
    setPage: setTeamLeaderPage,
    setPageSize: setTeamLeaderPageSize,
    pageCount: teamLeaderPageCount,
    total: teamLeaderTotal
  } = usePagination(teamLeaders);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中..." : "Loading..."}
        </div>
      ) : null}

      {user ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-white/90 font-semibold text-xl">
              {locale === "zh"
                ? isLeader
                  ? "团队长详情"
                  : "学员详情"
                : isLeader
                  ? "Leader details"
                  : "Student details"}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={toggleStatus}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
              >
                {user.status === "active" ? (locale === "zh" ? "冻结账号" : "Freeze") : locale === "zh" ? "解冻账号" : "Unfreeze"}
              </button>
              {canManage ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetPassword}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                  >
                    {locale === "zh" ? "重置密码" : "Reset password"}
                  </button>
                  {!isLeader && canManage ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={deleteStudent}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                    >
                      {locale === "zh" ? "删除学员" : "Delete"}
                    </button>
                  ) : null}
                    {!isLeader && canHardDelete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={hardDeleteStudent}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
                    >
                      {locale === "zh" ? "硬删除" : "Hard delete"}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="text-white/85 font-semibold">{locale === "zh" ? "基本信息" : "Profile"}</div>
              {field(locale === "zh" ? "姓名" : "Name", user.full_name)}
              {field(locale === "zh" ? "邮箱" : "Email", user.email, user.email)}
              {field(locale === "zh" ? "手机号" : "Phone", user.phone, user.phone)}
              {field(locale === "zh" ? "角色" : "Role", user.role)}
              {field(locale === "zh" ? "状态" : "Status", user.status)}
              {!isLeader ? field(locale === "zh" ? "学员状态" : "Student status", user.student_status) : null}
              {!isLeader ? field(locale === "zh" ? "来源" : "Source", user.source) : null}
              {field(
                locale === "zh" ? "注册时间" : "Created",
                user.created_at ? <ClientDateTime value={user.created_at} /> : null
              )}
              {field(
                locale === "zh" ? "最后登录" : "Last login",
                user.last_login_at ? <ClientDateTime value={user.last_login_at} /> : null
              )}
              {!isLeader && canManage ? (
                <div className="pt-2">
                  <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "修改学员状态" : "Update status"}</div>
                  <select
                    value={statusValue}
                    onChange={async (e) => {
                      const next = e.target.value;
                      if (!next) return;
                      const ok = window.confirm(
                        locale === "zh" ? `确认将学员状态改为「${next}」？` : `Update student status to "${next}"?`
                      );
                      if (!ok) {
                        setUser((prev) => (prev ? { ...prev } : prev));
                        return;
                      }
                      setBusy(true);
                      setError(null);
                      try {
                        const res = await fetch(`/api/system/admin/students/${user.id}/student-status`, {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ student_status: next })
                        });
                        const json = await res.json().catch(() => null);
                        if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
                        await load();
                      } catch (err: any) {
                        setError(err?.message || "update_failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  >
                    <option value="">请选择</option>
                    {studentStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {!isLeader && !isAssistant ? (
                <div className="pt-2">
                  <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "修改来源" : "Update source"}</div>
                  <select
                    value={user.source || ""}
                    onChange={(e) => updateSource(e.target.value)}
                    disabled={busy}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  >
                    <option value="">{locale === "zh" ? "未设置" : "Unset"}</option>
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {locale === "zh" ? opt.zh : opt.en}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {canManage ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-white/85 font-semibold">{locale === "zh" ? "重置密码" : "Reset password"}</div>
                <input
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  placeholder={locale === "zh" ? "输入新密码（可选）" : "Custom password (optional)"}
                />
                <div className="text-xs text-white/45">
                  {locale === "zh"
                    ? "规则：大小写+数字+特殊字符，长度 8-64"
                    : "Rule: upper+lower+digit+special, 8-64 chars."}
                </div>
                {resetPw ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    {locale === "zh" ? "新密码：" : "New password: "} <span className="font-semibold">{resetPw}</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={resetPassword}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {locale === "zh" ? "执行重置" : "Reset now"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="text-white/85 font-semibold">{locale === "zh" ? "发送通知" : "Send message"}</div>
            <input
              value={msg.title}
              onChange={(e) => setMsg((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              placeholder={locale === "zh" ? "标题（可选）" : "Title (optional)"}
            />
            <textarea
              value={msg.content}
              onChange={(e) => setMsg((p) => ({ ...p, content: e.target.value }))}
              className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              placeholder={locale === "zh" ? "内容" : "Content"}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !msg.content.trim()}
                onClick={sendMessage}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
              >
                {locale === "zh" ? "发送" : "Send"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={approveAll}
                className="ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                {locale === "zh" ? "通过所有申请" : "Approve requests"}
              </button>
            </div>
            <div className="text-xs text-white/45">
              {locale === "zh"
                ? "消息会出现在学员系统的“通知”里。"
                : "Messages show up in student's Notifications."}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      {isLeader && team ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="text-white/90 font-semibold text-xl">
            {locale === "zh" ? "团队学员概览" : "Team overview"}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">{locale === "zh" ? "学员总数" : "Students"}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{team.summary.total}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">{locale === "zh" ? "学员冻结" : "Student frozen"}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{team.summary.frozen}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">{locale === "zh" ? "下属团队长" : "Sub-leaders"}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{team.leaderSummary.total}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">{locale === "zh" ? "团队长冻结" : "Leader frozen"}</div>
              <div className="mt-2 text-3xl font-semibold text-white">{team.leaderSummary.frozen}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 h-[320px]">
              {teamChart ? <EChart option={teamChart as any} className="h-full w-full" /> : null}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 h-[320px]">
              {leaderChart ? <EChart option={leaderChart as any} className="h-full w-full" /> : null}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 text-white/85 font-semibold">
              {locale === "zh" ? "团队学员列表" : "Team students"}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "姓名" : "Name"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "邮箱" : "Email"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "手机号" : "Phone"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "学员状态" : "Student status"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "账号" : "Account"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "最近登录" : "Last login"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {teamStudentItems.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white/85 font-semibold !whitespace-nowrap">
                        {s.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-white/70">{s.email || "-"}</td>
                      <td className="px-4 py-3 text-white/70">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-white/70">{s.student_status || "-"}</td>
                      <td className="px-4 py-3 text-white/70">{s.status}</td>
                      <td className="px-4 py-3 text-white/60">
                        <ClientDateTime value={s.last_login_at} fallback="-" />
                      </td>
                    </tr>
                  ))}
                  {!teamStudents.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-white/60 text-center">
                        {locale === "zh" ? "暂无学员" : "No students"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {teamStudents.length ? (
              <PaginationControls
                total={teamStudentTotal}
                page={teamStudentPage}
                pageSize={teamStudentPageSize}
                pageCount={teamStudentPageCount}
                onPageChange={setTeamStudentPage}
                onPageSizeChange={setTeamStudentPageSize}
                locale={locale}
              />
            ) : null}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 text-white/85 font-semibold">
              {locale === "zh" ? "下属团队长" : "Sub-leaders"}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "姓名" : "Name"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "邮箱" : "Email"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "手机号" : "Phone"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "账号" : "Account"}</th>
                    <th className="px-4 py-3 text-left">{locale === "zh" ? "最近登录" : "Last login"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {teamLeaderItems.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white/85 font-semibold !whitespace-nowrap">
                        {s.full_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-white/70">{s.email || "-"}</td>
                      <td className="px-4 py-3 text-white/70">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-white/70">{s.status}</td>
                      <td className="px-4 py-3 text-white/60">
                        <ClientDateTime value={s.last_login_at} fallback="-" />
                      </td>
                    </tr>
                  ))}
                  {!teamLeaders.length ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-white/60 text-center">
                        {locale === "zh" ? "暂无团队长" : "No leaders"}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {teamLeaders.length ? (
              <PaginationControls
                total={teamLeaderTotal}
                page={teamLeaderPage}
                pageSize={teamLeaderPageSize}
                pageCount={teamLeaderPageCount}
                onPageChange={setTeamLeaderPage}
                onPageSizeChange={setTeamLeaderPageSize}
                locale={locale}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold">
          {locale === "zh" ? "课程状态" : "Course access"}
        </div>
        <div className="divide-y divide-white/10">
          {access.map((a) => {
            const enabled = a.status === "approved" || a.status === "completed";
            return (
              <div key={a.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                <div className="w-16 text-white/80">#{a.course_id}</div>
                <div className="text-white/60">{a.status}</div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-white/50">{typeof a.progress === "number" ? `${a.progress}%` : "-"}</div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateCourseAccess(a.course_id, enabled ? "reject" : "approve")}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                  >
                    {enabled ? (locale === "zh" ? "关闭" : "Revoke") : locale === "zh" ? "开通" : "Approve"}
                  </button>
                </div>
              </div>
            );
          })}
          {!access.length ? <div className="px-6 py-4 text-white/60">-</div> : null}
        </div>
      </div>

      {!isAssistant ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold">
            {locale === "zh" ? "文件权限" : "File access"}
          </div>
          <div className="divide-y divide-white/10">
            {filePermissions.map((row) => {
              const label = [row.files?.category, row.files?.name].filter(Boolean).join(" ");
              return (
                <div key={row.file_id} className="px-6 py-3 flex items-center gap-3 text-sm">
                  <div className="text-white/80">{label || row.file_id}</div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="text-white/50">
                      <ClientDateTime value={row.created_at} format="date" />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => revokeFilePermission(row.file_id)}
                      className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                    >
                      {locale === "zh" ? "关闭" : "Revoke"}
                    </button>
                  </div>
                </div>
              );
            })}
            {!filePermissions.length ? <div className="px-6 py-4 text-white/60">-</div> : null}
          </div>
        </div>
      ) : null}

      {!isAssistant ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/85 font-semibold">{locale === "zh" ? "天梯权限" : "Ladder access"}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="text-white/70">
              {locale === "zh" ? "当前状态" : "Status"}: <span className="text-white/90">{ladder?.status || "none"}</span>
            </div>
            {ladder?.rejection_reason ? (
              <div className="text-rose-200/80">
                {locale === "zh" ? "原因" : "Reason"}: {ladder.rejection_reason}
              </div>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => toggleLadder(ladder?.status === "approved" || ladder?.enabled ? "reject" : "approve")}
              className="ml-auto px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
            >
              {ladder?.status === "approved" || ladder?.enabled
                ? locale === "zh"
                  ? "关闭权限"
                  : "Revoke"
                : locale === "zh"
                  ? "开通权限"
                  : "Approve"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
















