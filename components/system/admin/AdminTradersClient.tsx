"use client";

import React from "react";

import { Link } from "@/i18n/navigation";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type TraderRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "frozen";
  student_status?: string | null;
  leader_id: string | null;
  leader?: { id?: string | null; full_name?: string | null; email?: string | null } | null;
  created_at?: string;
  last_login_at?: string | null;
};

function formatTime(value: string | null | undefined, locale: "zh" | "en") {
  if (!value) return "-";
  return (
    <ClientDateTime value={value} locale={locale === "zh" ? "zh-CN" : "en-US"} fallback={value} />
  );
}

export function AdminTradersClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<TraderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [meId, setMeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        const id = json?.ok ? String(json?.user?.id || "") : "";
        setMeId(id || null);
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
      const res = await fetch("/api/system/admin/traders/list", { cache: "no-store" });
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

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(items);

  const promote = async (row: TraderRow, action: "leader" | "coach") => {
    const message =
      action === "leader"
        ? locale === "zh"
          ? "确认将该交易员升级为直属团队长？"
          : "Promote this trader to a direct leader?"
        : locale === "zh"
          ? "确认将该交易员升级为直属教练？"
          : "Promote this trader to a direct coach?";
    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`/api/system/admin/students/${row.id}/promote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, direct: true })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    }
  };

  const directLabel = locale === "zh" ? "直属超管" : "Direct to super admin";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "交易员管理" : "Trader Management"}
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "查看所有团队交易员与超管直属交易员。"
            : "Review traders across all teams, including direct super admin traders."}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中…" : "Loading…"}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold">
          {locale === "zh" ? "交易员列表" : "Trader list"}
        </div>

        {!loading && !items.length ? (
          <div className="p-6 text-white/60">{locale === "zh" ? "暂无数据" : "No items"}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-white/50">
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left min-w-[180px] !max-w-none !whitespace-nowrap">
                  {locale === "zh" ? "姓名" : "Name"}
                </th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "邮箱" : "Email"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "手机" : "Phone"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "所属团队长" : "Leader"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "状态" : "Status"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "最近登录" : "Last login"}</th>
                <th className="px-6 py-3 text-right">{locale === "zh" ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pageItems.map((row) => {
                const leaderName =
                  row.leader_id && row.leader_id !== meId
                    ? row.leader?.full_name || row.leader?.email || row.leader_id.slice(0, 6)
                    : directLabel;
                const status = row.status === "frozen" ? "frozen" : "active";
                return (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white/85 font-semibold min-w-[180px] !max-w-none !whitespace-nowrap">
                      <span className="system-name">{row.full_name || "-"}</span>
                    </td>
                    <td className="px-6 py-4 text-white/70 max-w-[240px] truncate">{row.email || "-"}</td>
                    <td className="px-6 py-4 text-white/70">{row.phone || "-"}</td>
                    <td className="px-6 py-4 text-white/70">{leaderName}</td>
                    <td className="px-6 py-4 text-white/70">
                      <span className={status === "active" ? "text-emerald-300" : "text-rose-300"}>{status}</span>
                    </td>
                    <td className="px-6 py-4 text-white/60">{formatTime(row.last_login_at, locale)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/system/admin/students/${row.id}`}
                        locale={locale}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                      >
                        {locale === "zh" ? "详情" : "Details"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => promote(row, "leader")}
                        className="ml-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-100 hover:bg-sky-500/15"
                      >
                        {locale === "zh" ? "升为直属团队长" : "Direct Leader"}
                      </button>
                      <button
                        type="button"
                        onClick={() => promote(row, "coach")}
                        className="ml-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                      >
                        {locale === "zh" ? "升为直属教练" : "Direct Coach"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && items.length ? (
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
      </div>
    </div>
  );
}
