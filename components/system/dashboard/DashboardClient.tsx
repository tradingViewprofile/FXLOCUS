"use client";

import React from "react";

import { EChart } from "@/components/system/charts/EChart";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { StatusBadge } from "@/components/system/StatusBadge";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";

type StudentSummary = {
  ok: true;
  kind: "student";
  role: "student" | "trader" | "coach";
  totalCourses: number;
  counts: { completed: number; approved: number; requested: number };
  items: Array<{ course_id: number; status: string; progress: number; updated_at: string | null }>;
  latest: Array<{ course_id: number; status: string; progress: number; updated_at: string | null }>;
};

type AdminSummary = {
  ok: true;
  kind: "admin";
  role: "leader" | "super_admin";
  students: { total: number; frozen: number; byStatus: Record<string, number> };
  courses: Record<"requested" | "approved" | "rejected" | "completed", number>;
  pending: { fileAccessRequests: number };
};

type Summary = StudentSummary | AdminSummary;

const COURSE_STATUSES = ["requested", "approved", "completed", "rejected", "none"] as const;

function statusLabel(status: string, locale: "zh" | "en") {
  const mapZh: Record<string, string> = {
    requested: "已申请",
    approved: "已通过",
    rejected: "已拒绝",
    completed: "已完成",
    none: "未申请"
  };
  const mapEn: Record<string, string> = {
    requested: "Requested",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    none: "Not requested"
  };
  return (locale === "zh" ? mapZh : mapEn)[status] || status;
}

function buildStudent3DOption(locale: "zh" | "en", items: StudentSummary["items"], totalCourses: number) {
  const x = Array.from({ length: totalCourses }, (_, i) => String(i + 1));
  const y = COURSE_STATUSES.map((s) => statusLabel(s, locale));

  const byCourse = new Map(items.map((r) => [r.course_id, r]));
  const raw = Array.from({ length: totalCourses }, (_, idx) => {
    const courseId = idx + 1;
    const row = byCourse.get(courseId);
    const st = (row?.status as any) || "none";
    const stIndex = COURSE_STATUSES.indexOf(st) >= 0 ? COURSE_STATUSES.indexOf(st) : COURSE_STATUSES.indexOf("none");
    const progress = Math.max(0, Math.min(100, Number(row?.progress || 0)));
    return [idx, stIndex, progress];
  });

  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: "cubicOut",
    animationDurationUpdate: 1800,
    animationEasingUpdate: "cubicInOut",
    tooltip: {
      formatter: (p: any) => {
        const [cx, cy, cz] = p?.value || [];
        const courseLabel = locale === "zh" ? `第${Number(cx) + 1}课` : `Lesson ${Number(cx) + 1}`;
        const statusText = y[Number(cy)] || "-";
        return `${courseLabel}<br/>${locale === "zh" ? "状态" : "Status"}: ${statusText}<br/>${
          locale === "zh" ? "进度" : "Progress"
        }: ${cz ?? 0}%`;
      }
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      inRange: { color: ["#1e3a8a", "#38bdf8", "#10b981"] }
    },
    xAxis3D: {
      type: "category",
      data: x,
      name: locale === "zh" ? "课节" : "Lesson",
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    yAxis3D: {
      type: "category",
      data: y,
      name: locale === "zh" ? "状态" : "Status",
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    zAxis3D: {
      type: "value",
      name: locale === "zh" ? "进度" : "Progress",
      min: 0,
      max: 100,
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    grid3D: {
      boxWidth: 180,
      boxDepth: 80,
      boxHeight: 90,
      viewControl: {
        alpha: 30,
        beta: 20,
        distance: 220,
        autoRotate: true,
        autoRotateSpeed: 10,
        autoRotateAfterStill: 4,
        damping: 0.4
      },
      light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.35 } }
    },
    series: [
      {
        type: "bar3D",
        data: raw,
        shading: "realistic",
        bevelSize: 0.3,
        realisticMaterial: { roughness: 0.25, metalness: 0.1 },
        label: { show: false }
      }
    ]
  };
}

function buildAdmin3DOption(locale: "zh" | "en", byStatus: Record<string, number>) {
  const statuses = Object.keys(byStatus);
  const x = statuses.map((s) => (locale === "zh" ? s : s));
  const y = [locale === "zh" ? "学员数" : "Students"];
  const max = Math.max(1, ...statuses.map((s) => Number(byStatus[s] || 0)));

  const data = statuses.map((s, idx) => [idx, 0, Number(byStatus[s] || 0)]);

  return {
    animation: true,
    animationDuration: 1200,
    animationEasing: "cubicOut",
    animationDurationUpdate: 1800,
    animationEasingUpdate: "cubicInOut",
    tooltip: {
      formatter: (p: any) => {
        const [cx, _cy, cz] = p?.value || [];
        const name = x[Number(cx)] || "-";
        return `${name}<br/>${y[0]}: ${cz ?? 0}`;
      }
    },
    visualMap: { show: false, min: 0, max, inRange: { color: ["#1e3a8a", "#38bdf8", "#f59e0b"] } },
    xAxis3D: {
      type: "category",
      data: x,
      name: locale === "zh" ? "学员状态" : "Student status",
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    yAxis3D: {
      type: "category",
      data: y,
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    zAxis3D: {
      type: "value",
      min: 0,
      max,
      axisLabel: { color: "rgba(255,255,255,0.8)" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.3)" } }
    },
    grid3D: {
      boxWidth: 160,
      boxDepth: 40,
      boxHeight: 80,
      viewControl: {
        alpha: 25,
        beta: 35,
        distance: 200,
        autoRotate: true,
        autoRotateSpeed: 12,
        autoRotateAfterStill: 4,
        damping: 0.45
      },
      light: { main: { intensity: 1.1, shadow: true }, ambient: { intensity: 0.3 } }
    },
    series: [
      {
        type: "bar3D",
        data,
        shading: "realistic",
        bevelSize: 0.3,
        realisticMaterial: { roughness: 0.28, metalness: 0.08 }
      }
    ]
  };
}

export function DashboardClient({ locale }: { locale: "zh" | "en" }) {
  const [data, setData] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const aliveRef = React.useRef(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/dashboard/summary", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!aliveRef.current) return;
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setData(json as Summary);
    } catch (e: any) {
      if (!aliveRef.current) return;
      setError(e?.message || "load_failed");
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  useSystemRealtimeRefresh(load);

  const chart = React.useMemo(() => {
    if (!data || loading || error) return null;
    if (data.kind === "student") return buildStudent3DOption(locale, data.items, data.totalCourses);
    return buildAdmin3DOption(locale, data.students.byStatus);
  }, [data, error, loading, locale]);

  const isEmpty =
    !loading &&
    !error &&
    data &&
    (data.kind === "student" ? data.items.length === 0 : data.students.total === 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "仪表盘" : "Dashboard"}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh" ? "3D 数据概览（ECharts GL）。" : "3D overview (ECharts GL)."}
        </div>
      </div>

      {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">{locale === "zh" ? "加载中…" : "Loading…"}</div> : null}
      {error ? <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div> : null}

      {!loading && !error && data ? (
        <>
          {data.kind === "student" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "已完成" : "Completed"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  {data.counts.completed}/{data.totalCourses}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "已授权" : "Approved"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.counts.approved}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "待审批" : "Requested"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.counts.requested}</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "学员数" : "Students"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.students.total}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "冻结" : "Frozen"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.students.frozen}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/50">{locale === "zh" ? "文件待审批" : "File requests"}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{data.pending.fileAccessRequests}</div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-white/85 font-semibold">
              {locale === "zh" ? "3D 图表" : "3D chart"}
            </div>
            {isEmpty ? (
              <div className="mt-3 text-white/60 text-sm">{locale === "zh" ? "暂无数据" : "No data"}</div>
            ) : (
              <div className="mt-4 h-[420px] w-full rounded-2xl border border-white/10 bg-white/5">
                {chart ? <EChart option={chart as any} className="h-full w-full" /> : null}
              </div>
            )}
          </div>

          {data.kind === "student" ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-white/85 font-semibold">{locale === "zh" ? "最近学习" : "Recent learning"}</div>
              <div className="mt-3 space-y-2">
                {data.latest.length ? (
                  data.latest.map((row) => (
                    <div key={row.course_id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-white/85 text-sm font-semibold">
                        {locale === "zh" ? `第${row.course_id}课` : `Lesson ${row.course_id}`}
                      </div>
                      <div className="text-white/50 text-xs">
                        <ClientDateTime
                          value={row.updated_at}
                          locale={locale === "zh" ? "zh-CN" : "en-US"}
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <StatusBadge value={row.status} locale={locale} />
                        <span className="text-white/60 text-xs">{row.progress ?? 0}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/60 text-sm">
                    {locale === "zh" ? "暂无记录。去课程页申请并开始学习。" : "No activity yet. Request a course and start learning."}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

