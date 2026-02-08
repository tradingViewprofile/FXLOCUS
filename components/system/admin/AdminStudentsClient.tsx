"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { Tooltip } from "@/components/system/Tooltip";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: "student" | "trader" | "coach" | "assistant" | "leader";
  status: "active" | "frozen" | "deleted";
  student_status: "普通学员" | "考核通过" | "学习中" | "捐赠学员" | "考核通过+捐赠学员";
  leader_id: string | null;
  leader?: { id: string; full_name: string | null; email: string | null } | null;
  created_by?: string | null;
  assistant?: { id?: string | null; full_name?: string | null; email?: string | null; role?: string | null; status?: string | null } | null;
  coach_id?: string | null;
  coach?: { id?: string | null; full_name?: string | null; email?: string | null } | null;
  source?: string | null;
  created_at?: string;
  last_login_at?: string | null;
  stats?: { requested: number; approved: number; completed: number; rejected: number };
};

type LeaderRow = { id: string; role: "leader" | "super_admin"; full_name: string | null; email: string | null };
type CoachRow = { id: string; full_name: string | null; email: string | null };

const PHONE_REGEX = /^\+?[0-9]{6,20}$/;

function formatFieldErrors(details: any) {
  if (!details || typeof details !== "object") return "";
  const formErrors = Array.isArray(details.formErrors) ? details.formErrors.filter(Boolean) : [];
  const fieldErrors = details.fieldErrors && typeof details.fieldErrors === "object" ? details.fieldErrors : {};
  const fieldMessages = Object.entries(fieldErrors).flatMap(([key, value]) => {
    if (!Array.isArray(value)) return [];
    return value.filter(Boolean).map((msg) => `${key}: ${msg}`);
  });
  const all = [...formErrors, ...fieldMessages].filter(Boolean);
  return all.length ? all.join("; ") : "";
}

function buildApiError(json: any, fallback: string) {
  const base = json?.error || fallback;
  const detail = formatFieldErrors(json?.details);
  return detail ? `${base}: ${detail}` : base;
}

const STUDENT_STATUS_OPTIONS = ["普通学员", "考核通过", "学习中", "捐赠学员", "考核通过+捐赠学员"] as const;
type StudentStatus = (typeof STUDENT_STATUS_OPTIONS)[number];

function formatTime(value: string | null | undefined, locale: "zh" | "en") {
  if (!value) return "-";
  return (
    <ClientDateTime value={value} locale={locale === "zh" ? "zh-CN" : "en-US"} fallback={value} />
  );
}

function passwordIssues(value: string, locale: "zh" | "en") {
  const pwd = String(value || "");
  const issues: string[] = [];
  if (pwd.length < 8) issues.push(locale === "zh" ? "至少 8 位" : "Min 8 chars");
  if (pwd.length > 64) issues.push(locale === "zh" ? "不超过 64 位" : "Max 64 chars");
  if (!/[a-z]/.test(pwd)) issues.push(locale === "zh" ? "需要小写字母" : "Lowercase required");
  if (!/[A-Z]/.test(pwd)) issues.push(locale === "zh" ? "需要大写字母" : "Uppercase required");
  if (!/\d/.test(pwd)) issues.push(locale === "zh" ? "需要数字" : "Digit required");
  if (!/[^A-Za-z0-9]/.test(pwd)) issues.push(locale === "zh" ? "需要特殊字符" : "Special char required");
  return issues;
}

export function AdminStudentsClient({ locale }: { locale: "zh" | "en" }) {
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<StudentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [meRole, setMeRole] = React.useState<"leader" | "super_admin" | "assistant" | null>(null);
  const [meLabel, setMeLabel] = React.useState("");
  const [leaders, setLeaders] = React.useState<LeaderRow[]>([]);
  const [coaches, setCoaches] = React.useState<CoachRow[]>([]);

  const [filters, setFilters] = React.useState<{
    q: string;
    status: "all" | "active" | "frozen";
    studentStatus: "all" | StudentStatus;
    role: "all" | "student" | "trader" | "coach" | "assistant" | "leader";
    coachId: string;
    source: "all" | string;
  }>(() => ({ q: "", status: "all", studentStatus: "all", role: "all", coachId: "", source: "all" }));

  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    initialPassword: "",
    defaultOpenCourses: 0,
    leaderId: "",
    source: ""
  });
  const [creating, setCreating] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [bulkMsg, setBulkMsg] = React.useState({ title: "", content: "" });

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
        const label = String(json?.user?.full_name || json?.user?.email || "").trim();
        if (label) setMeLabel(label);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (meRole !== "assistant") return;
    setForm((prev) => (prev.defaultOpenCourses === 1 ? prev : { ...prev, defaultOpenCourses: 1 }));
  }, [meRole]);

  React.useEffect(() => {
    if (form.source === "商业化" || form.source === "其他渠道") {
      setForm((prev) => (prev.defaultOpenCourses === 0 ? prev : { ...prev, defaultOpenCourses: 0 }));
    }
  }, [form.source]);

  React.useEffect(() => {
    const roleParam = searchParams?.get("role") || "";
    const coachParam = searchParams?.get("coachId") || "";
    const nextRole =
      roleParam === "student" ||
      roleParam === "trader" ||
      roleParam === "coach" ||
      roleParam === "assistant" ||
      roleParam === "leader"
        ? roleParam
        : "all";
    setFilters((prev) => ({
      ...prev,
      role: nextRole,
      coachId: coachParam
    }));
  }, [searchParams]);

  React.useEffect(() => {
    if (meRole !== "super_admin") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/admin/leaders/list", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) return;
        const raw: LeaderRow[] = Array.isArray(json.items) ? json.items : [];
        setLeaders(raw.filter((r) => r.role === "leader"));
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [meRole]);

  React.useEffect(() => {
    if (!meRole || meRole === "assistant") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/admin/coaches/list", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) return;
        const rows: CoachRow[] = Array.isArray(json.items) ? json.items : [];
        setCoaches(rows);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [meRole]);

  const sourceOptions = React.useMemo(() => {
    const values = new Set<string>();
    items.forEach((item) => {
      if (item.source) values.add(item.source);
    });
    const preferred = ["boss", "商业化", "其他渠道"];
    const ordered = preferred.filter((value) => values.has(value));
    const rest = Array.from(values).filter((value) => !preferred.includes(value)).sort();
    return [...ordered, ...rest];
  }, [items]);

  const sourceLabel = React.useCallback(
    (value: string) => {
      if (!value) return value;
      if (value === "boss") return "boss";
      if (value === "商业化") return locale === "zh" ? "商业化" : "Commercial";
      if (value === "其他渠道") return locale === "zh" ? "其他" : "Other";
      return value;
    },
    [locale]
  );


  const resolveCreateStudentError = React.useCallback(
    (json: any) => {
      const code = String(json?.error || "");
      if (code === "EMAIL_EXISTS") {
        return locale === "zh" ? "该邮箱已存在，无法重复创建。" : "Email already exists.";
      }
      if (code === "INVALID_PHONE") {
        return locale === "zh" ? "手机号格式不正确。" : "Invalid phone number.";
      }
      if (code === "PHONE_REQUIRED") {
        return locale === "zh" ? "手机号为必填项。" : "Phone number is required.";
      }
      if (code === "MISSING_LEADER") {
        return locale === "zh" ? "当前账号未绑定团队长，无法创建。" : "Missing leader assignment.";
      }
      if (code === "WEAK_PASSWORD") {
        return locale === "zh"
          ? "密码不符合规则，请重新设置。"
          : "Password does not meet requirements.";
      }
      if (code === "INVALID_BODY") {
        const fields = json?.details?.fieldErrors || {};
        if (fields?.email?.length) {
          return locale === "zh" ? "邮箱格式不正确。" : "Invalid email format.";
        }
        if (fields?.fullName?.length) {
          return locale === "zh" ? "请填写学员姓名。" : "Full name is required.";
        }
        return locale === "zh"
          ? "表单填写有误，请检查后重试。"
          : "Invalid form data. Please check and retry.";
      }
      return buildApiError(
        json,
        locale === "zh" ? "创建失败，请稍后重试。" : "Create failed. Please try again."
      );
    },
    [locale]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/students/list", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);
  useSystemRealtimeRefresh(load);

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const issues = passwordIssues(form.initialPassword, locale);
      if (issues.length) throw new Error((locale === "zh" ? "密码不符合规则：" : "Password issues: ") + issues.join(" · "));
      const trimmedPhone = form.phone.trim();
      const normalizedPhone = trimmedPhone.replace(/[\s-]/g, "");
      if (!normalizedPhone) {
        throw new Error(locale === "zh" ? "手机号为必填项。" : "Phone number is required.");
      }
      if (!PHONE_REGEX.test(normalizedPhone)) {
        throw new Error(locale === "zh" ? "手机号格式不正确。" : "Invalid phone number.");
      }

      const ok = window.confirm(locale === "zh" ? "确认创建该学员？" : "Create this student?");
      if (!ok) return;
      setCreating(true);

      const res = await fetch("/api/system/admin/students/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: normalizedPhone,
          initialPassword: form.initialPassword,
          defaultOpenCourses:
            form.source === "商业化" || form.source === "其他渠道"
              ? 0
              : isAssistant
                ? 1
                : Number(form.defaultOpenCourses || 0),
          leaderId: meRole === "super_admin" ? form.leaderId || undefined : undefined,
          source: form.source || undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(resolveCreateStudentError(json));
      setForm({
        fullName: "",
        email: "",
        phone: "",
        initialPassword: "",
        defaultOpenCourses: 0,
        leaderId: "",
        source: ""
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "create_failed");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (row: StudentRow) => {
    const next = row.status === "active" ? "frozen" : "active";
    const ok = window.confirm(
      locale === "zh"
        ? next === "frozen"
          ? "确认冻结该账号？"
          : "确认解冻该账号？"
        : next === "frozen"
          ? "Freeze this account?"
          : "Unfreeze this account?"
    );
    if (!ok) return;
    try {
      await fetch(`/api/system/admin/students/${row.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      await load();
    } catch {
      // ignore
    }
  };

  const promoteToLeader = async (row: StudentRow) => {
    const ok = window.confirm(
      locale === "zh" ? "确认将该学员升为团队长？" : "Promote this student to leader?"
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/system/admin/students/${row.id}/promote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "leader" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    }
  };

  const assignCoach = async (row: StudentRow, coachIdRaw: string) => {
    const coachId = coachIdRaw || null;
    const actionLabel = coachId
      ? locale === "zh"
        ? "分配教练"
        : "Assign coach"
      : locale === "zh"
        ? "取消分配教练"
        : "Unassign coach";
    const ok = window.confirm(
      locale === "zh"
        ? `确认${actionLabel}给该学员/交易员？`
        : `Confirm to ${actionLabel.toLowerCase()} for this learner?`
    );
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch("/api/system/admin/coaches/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: row.id, coachId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    }
  };

  const isAssistant = meRole === "assistant";
  const pwdIssues = form.initialPassword ? passwordIssues(form.initialPassword, locale) : [];
  const passwordOk = form.initialPassword ? isStrongSystemPassword(form.initialPassword) : false;
  const phoneMissing = !form.phone.trim();
  const phoneInvalid = form.phone.trim()
    ? !PHONE_REGEX.test(form.phone.trim().replace(/[\s-]/g, ""))
    : false;
  const selectedList = Array.from(selected);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (items.length && prev.size !== items.length) {
        items.forEach((it) => next.add(it.id));
      } else {
        next.clear();
      }
      return next;
    });
  };

  const sendBulk = async () => {
    if (!selectedList.length || !bulkMsg.title.trim()) return;
    const ok = window.confirm(
      locale === "zh"
        ? `确认发送通知给已选 ${selectedList.length} 名学员？`
        : `Send notification to ${selectedList.length} selected learners?`
    );
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch("/api/system/admin/notifications/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userIds: selectedList,
          title: bulkMsg.title.trim(),
          content: bulkMsg.content.trim() || undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "send_failed");
      setBulkMsg({ title: "", content: "" });
      setSelected(new Set());
    } catch (e: any) {
      setError(e?.message || "send_failed");
    }
  };

  const filtered = React.useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    return items.filter((row) => {
      if (filters.role !== "all" && row.role !== filters.role) return false;
      if (filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.studentStatus !== "all" && row.student_status !== filters.studentStatus) return false;
      if (filters.coachId && row.coach_id !== filters.coachId) return false;
      if (filters.source !== "all" && (row.source || "") !== filters.source) return false;
      if (!needle) return true;
      const hay = `${row.full_name || ""} ${row.email || ""} ${row.phone || ""} ${row.leader?.full_name || ""} ${row.leader?.email || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [filters.q, filters.status, filters.studentStatus, filters.role, filters.coachId, filters.source, items]);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(filtered, {
    deps: [filters.q, filters.status, filters.studentStatus, filters.role, filters.coachId, filters.source]
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "学员管理" : "Students"}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "创建学员、冻结账号、查看课程申请与进度。"
            : "Create students, freeze accounts, and review progress."}
        </div>
      </div>

      <form onSubmit={createStudent} className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/85 font-semibold">{locale === "zh" ? "创建学员" : "Create student"}</div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "姓名" : "Full name"}</div>
            <input
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              placeholder={locale === "zh" ? "请输入真实姓名/昵称" : "Enter name"}
              required
            />
          </div>
          <div>
            <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "邮箱（登录账号）" : "Email (login)"}</div>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "手机号" : "Phone"}</div>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              placeholder={locale === "zh" ? "请输入手机号" : "Phone number"}
              required
            />
            {phoneMissing ? (
              <div className="mt-2 text-xs text-rose-200/90">
                {locale === "zh" ? "手机号为必填项。" : "Phone number is required."}
              </div>
            ) : phoneInvalid ? (
              <div className="mt-2 text-xs text-rose-200/90">
                {locale === "zh" ? "手机号格式不正确。" : "Invalid phone number."}
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "初始密码" : "Initial password"}</div>
            <input
              value={form.initialPassword}
              onChange={(e) => setForm((p) => ({ ...p, initialPassword: e.target.value }))}
              className={[
                "w-full rounded-xl border bg-white/5 px-3 py-2 text-white/85 text-sm",
                form.initialPassword && !passwordOk ? "border-rose-400/30" : "border-white/10"
              ].join(" ")}
              placeholder={locale === "zh" ? "至少 8 位" : "8+ chars, upper/lower/digit/special"}
              required
              type="password"
            />
            {form.initialPassword && pwdIssues.length ? (
              <div className="mt-2 text-xs text-rose-200/90">{pwdIssues.join(" · ")}</div>
            ) : (
              <div className="mt-2 text-xs text-white/45">
                {locale === "zh" ? "规则：大小写+数字+特殊字符，长度 8-64" : "Rule: upper+lower+digit+special, 8-64 chars."}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-white/55 mb-2">
              {locale === "zh" ? "默认开通课程多少节" : "Default open lessons"}
            </div>
            <input
              type="number"
              min={0}
              max={21}
              value={form.source === "商业化" || form.source === "其他渠道" ? 0 : isAssistant ? 1 : form.defaultOpenCourses}
              onChange={(e) => {
                if (isAssistant || form.source === "商业化" || form.source === "其他渠道") return;
                setForm((p) => ({ ...p, defaultOpenCourses: Number(e.target.value || 0) }));
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              disabled={isAssistant || form.source === "商业化" || form.source === "其他渠道"}
            />
            <div className="mt-2 text-xs text-white/45">
              {form.source === "商业化" || form.source === "其他渠道"
                ? locale === "zh"
                  ? "商业化/其他渠道来源默认不开通课程。"
                  : "Commercial/other sources default to 0 courses."
                : isAssistant
                ? locale === "zh"
                  ? "助教创建学员默认开通 1 节，不可修改。"
                  : "Assistants always open 1 lesson by default."
                : locale === "zh"
                  ? "例如填 3，则默认开通第 1~3 课（可后续在课程审批中调整）。"
                  : "E.g. 3 means course #1~#3 approved by default."}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "来源" : "Source"}</div>
            <select
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
            >
              <option value="">{locale === "zh" ? "请选择来源" : "Select source"}</option>
              <option value="boss">boss</option>
              <option value="商业化">{locale === "zh" ? "商业化" : "Commercial"}</option>
              <option value="其他渠道">{locale === "zh" ? "其他" : "Other"}</option>
            </select>
          </div>

          {meRole === "super_admin" ? (
            <div>
              <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "归属团队长" : "Leader owner"}</div>
              <select
                value={form.leaderId}
                onChange={(e) => setForm((p) => ({ ...p, leaderId: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
              >
                <option value="">{locale === "zh" ? "（可选）不指定" : "(optional) Unassigned"}</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {(l.full_name || l.email || l.id) as any}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-white/45">
                {locale === "zh"
                  ? "团队长创建时会自动归属到自己；超管可在此指定归属。"
                  : "Leader-created students auto-assign; super admin can set owner here."}
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={creating || !passwordOk}
              className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
            >
              {creating ? (locale === "zh" ? "创建中..." : "Creating...") : locale === "zh" ? "创建学员" : "Create student"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold">
          {locale === "zh" ? "学员列表" : "List"}
        </div>

        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center gap-2">
          <input
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            placeholder={locale === "zh" ? "搜索：姓名/邮箱/手机" : "Search: name/email/phone"}
          />
          <select
            value={filters.studentStatus}
            onChange={(e) => setFilters((p) => ({ ...p, studentStatus: e.target.value as any }))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="all">{locale === "zh" ? "全部学员状态" : "All student status"}</option>
            {STUDENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="all">{locale === "zh" ? "全部账号状态" : "All account status"}</option>
            <option value="active">{locale === "zh" ? "正常" : "Active"}</option>
            <option value="frozen">{locale === "zh" ? "冻结" : "Frozen"}</option>
          </select>
          <select
            value={filters.role}
            onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value as any }))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="all">{locale === "zh" ? "全部角色" : "All roles"}</option>
            <option value="student">{locale === "zh" ? "学员" : "Student"}</option>
            <option value="trader">{locale === "zh" ? "交易员" : "Trader"}</option>
            <option value="coach">{locale === "zh" ? "教练" : "Coach"}</option>
            <option value="assistant">{locale === "zh" ? "助教" : "Assistant"}</option>
            <option value="leader">{locale === "zh" ? "团队长" : "Leader"}</option>
          </select>
          <select
            value={filters.source}
            onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="all">{locale === "zh" ? "全部来源" : "All sources"}</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
          {!isAssistant ? (
            <>
              <select
                value={filters.coachId}
                onChange={(e) => setFilters((p) => ({ ...p, coachId: e.target.value }))}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
              >
                <option value="">{locale === "zh" ? "全部教练" : "All coaches"}</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name || coach.email || coach.id.slice(0, 6)}
                  </option>
                ))}
              </select>
              {filters.coachId ? (
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, coachId: "" }))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 hover:bg-white/10"
                >
                  {locale === "zh" ? "清除教练筛选" : "Clear coach filter"}
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {loading ? <div className="p-6 text-white/60">{locale === "zh" ? "加载中..." : "Loading..."}</div> : null}
        {!loading && !filtered.length ? <div className="p-6 text-white/60">{locale === "zh" ? "暂无数据" : "No items"}</div> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-white/50">
              <tr className="border-b border-white/10">
                {!isAssistant ? (
                  <th className="px-6 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={Boolean(filtered.length) && selected.size === filtered.length}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (filtered.length && prev.size !== filtered.length) filtered.forEach((it) => next.add(it.id));
                          else filtered.forEach((it) => next.delete(it.id));
                          return next;
                        });
                      }}
                      className="h-4 w-4 accent-sky-400"
                      aria-label="select all"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-3 text-left min-w-[160px] whitespace-nowrap">
                  {locale === "zh" ? "姓名" : "Name"}
                </th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "邮箱" : "Email"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "手机号" : "Phone"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "所属团队长" : "Leader"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "助教" : "Assistant"}</th>
                {!isAssistant ? (
                  <th className="px-6 py-3 text-left">{locale === "zh" ? "教练" : "Coach"}</th>
                ) : null}
                <th className="px-6 py-3 text-left">{locale === "zh" ? "学员状态" : "Student status"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "来源" : "Source"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "账号" : "Account"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "最近登录" : "Last login"}</th>
                <th className="px-6 py-3 text-right">{locale === "zh" ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pageItems.map((row) => (
                <tr key={row.id} className="hover:bg-white/5">
                  {!isAssistant ? (
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        className="h-4 w-4 accent-sky-400"
                        aria-label="select"
                      />
                    </td>
                  ) : null}
                  <td className="px-6 py-4 text-white/90 font-semibold whitespace-nowrap">
                    <span className="system-name">{row.full_name || "-"}</span>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    <Tooltip content={row.email || "-"}>
                      <span className="block max-w-[240px] truncate">{row.email || "-"}</span>
                    </Tooltip>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    <Tooltip content={row.phone || "-"}>
                      <span className="block max-w-[160px] truncate">{row.phone || "-"}</span>
                    </Tooltip>
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {(() => {
                      const fallback =
                        meRole === "super_admin" && !row.leader_id
                          ? meLabel || (locale === "zh" ? "超管" : "Super admin")
                          : "-";
                      const leaderLabel = row.leader?.full_name || row.leader?.email || fallback;
                      const leaderTooltip = row.leader?.full_name || row.leader?.email || row.leader_id || fallback;
                      return (
                        <Tooltip content={leaderTooltip}>
                          <span className="block max-w-[200px] truncate">{leaderLabel}</span>
                        </Tooltip>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {(() => {
                      const fallback =
                        meRole === "super_admin" && !row.leader_id
                          ? meLabel || (locale === "zh" ? "超管" : "Super admin")
                          : "-";
                      const leaderLabel = row.leader?.full_name || row.leader?.email || fallback;
                      const leaderTooltip = row.leader?.full_name || row.leader?.email || row.leader_id || fallback;
                      const assistant = row.assistant || null;
                      const assistantActive =
                        Boolean(assistant) && assistant?.role === "assistant" && assistant?.status !== "deleted";
                      const assistantLabel = assistantActive
                        ? assistant?.full_name || assistant?.email || "-"
                        : leaderLabel;
                      const assistantTooltip = assistantActive
                        ? assistant?.full_name || assistant?.email || assistant?.id || "-"
                        : leaderTooltip;
                      return (
                        <Tooltip content={assistantTooltip}>
                          <span className="block max-w-[200px] truncate">{assistantLabel}</span>
                        </Tooltip>
                      );
                    })()}
                  </td>
                  {!isAssistant ? (
                    <td className="px-6 py-4 text-white/70">
                      {row.role === "student" || row.role === "trader" ? (
                        <select
                          value={row.coach_id || ""}
                          onChange={(e) => assignCoach(row, e.target.value)}
                          className="w-full min-w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                        >
                          <option value="">{locale === "zh" ? "未分配" : "Unassigned"}</option>
                          {coaches.map((coach) => (
                            <option key={coach.id} value={coach.id}>
                              {coach.full_name || coach.email || coach.id.slice(0, 6)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-6 py-4 text-white/70">{row.student_status || "-"}</td>
                  <td className="px-6 py-4 text-white/70">{row.source || "-"}</td>
                  <td className="px-6 py-4 text-white/70">
                    <span className={row.status === "active" ? "text-emerald-300" : "text-rose-300"}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60">{formatTime(row.last_login_at, locale)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <a
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                      href={
                        isAssistant
                          ? `/${locale}/system/assistant/students/${row.id}`
                          : `/${locale}/system/admin/students/${row.id}`
                      }
                    >
                      {locale === "zh" ? "详情" : "Details"}
                    </a>
                    {!isAssistant ? (
                      <button
                        type="button"
                        onClick={() => promoteToLeader(row)}
                        className="ml-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-100 hover:bg-sky-500/15"
                      >
                        {locale === "zh" ? "升为团队长" : "Promote"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleStatus(row)}
                      className="ml-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                    >
                      {row.status === "active" ? (locale === "zh" ? "冻结" : "Freeze") : locale === "zh" ? "解冻" : "Unfreeze"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length ? (
          <PaginationControls
            total={total}
            page={page}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            locale={locale}
          />
        ) : null}

        {!isAssistant ? (
          <div className="px-6 py-4 border-t border-white/10 text-xs text-white/50 flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            >
              {selected.size === items.length && items.length
                ? locale === "zh"
                  ? "取消全选"
                  : "Clear all"
                : locale === "zh"
                  ? "全选当前"
                  : "Select all"}
            </button>
            <span className="ml-auto">
              {locale === "zh" ? "已选" : "Selected"} {selected.size}
            </span>
          </div>
        ) : null}
      </div>

      {!isAssistant ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
          <div className="text-white/85 font-semibold">
            {locale === "zh" ? "批量通知" : "Bulk notifications"}
          </div>
          <div className="text-xs text-white/50">
            {locale === "zh"
              ? "已选学员会收到系统通知（支持多选）。"
              : "Selected students will receive a system notification."}
          </div>
          <input
            value={bulkMsg.title}
            onChange={(e) => setBulkMsg((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
            placeholder={locale === "zh" ? "标题（必填）" : "Title (required)"}
          />
          <textarea
            value={bulkMsg.content}
            onChange={(e) => setBulkMsg((p) => ({ ...p, content: e.target.value }))}
            className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
            placeholder={locale === "zh" ? "内容（可选）" : "Content (optional)"}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!selectedList.length || !bulkMsg.title.trim()}
              onClick={sendBulk}
              className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
            >
              {locale === "zh" ? `发送给已选(${selectedList.length})` : `Send (${selectedList.length})`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}











