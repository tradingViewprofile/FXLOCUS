"use client";

import React from "react";

import { dispatchSystemRealtime } from "@/lib/system/realtime";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type RequestItem = {
  user_id: string;
  file_id: string;
  requested_at?: string | null;
  user?: {
    id: string;
    full_name?: string;
    email?: string | null;
    phone?: string | null;
    support_name?: string | null;
    assistant_name?: string | null;
    coach_name?: string | null;
  } | null;
  file?: { id: string; category?: string | null; name?: string | null; description?: string | null } | null;
};

const REJECTION_REASONS = ["资料不完整", "不符合要求", "名额已满", "重复申请", "其他"] as const;
type RejectionReason = (typeof REJECTION_REASONS)[number];

export function AdminFileRequestsClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<RequestItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [filterStudent, setFilterStudent] = React.useState("");
  const [filterFile, setFilterFile] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState<Record<string, string>>({});
  const [bulkRejectReason, setBulkRejectReason] = React.useState<RejectionReason>("其他");

  const keyOf = React.useCallback((it: Pick<RequestItem, "user_id" | "file_id">) => `${it.user_id}:${it.file_id}`, []);

  const filtered = React.useMemo(() => {
    const studentNeedle = filterStudent.trim().toLowerCase();
    const fileNeedle = filterFile.trim().toLowerCase();
    return items.filter((it) => {
      if (studentNeedle) {
        const hay = `${it.user?.full_name || ""} ${it.user?.email || ""} ${it.user?.phone || ""}`.toLowerCase();
        if (!hay.includes(studentNeedle)) return false;
      }
      if (fileNeedle) {
        const hay = `${it.file?.category || ""} ${it.file?.name || ""} ${it.file?.description || ""}`.toLowerCase();
        if (!hay.includes(fileNeedle)) return false;
      }
      return true;
    });
  }, [filterFile, filterStudent, items]);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(filtered, {
    deps: [filterStudent, filterFile]
  });

  const selectedItems = React.useMemo(() => {
    const byKey = new Map(items.map((it) => [keyOf(it), it]));
    return Array.from(selected)
      .map((k) => byKey.get(k))
      .filter(Boolean) as RequestItem[];
  }, [items, keyOf, selected]);

  const allFilteredSelected = React.useMemo(() => {
    if (!filtered.length) return false;
    return filtered.every((it) => selected.has(keyOf(it)));
  }, [filtered, keyOf, selected]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/files/requests", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");

      const nextItems = Array.isArray(json.items) ? (json.items as RequestItem[]) : [];
      setItems(nextItems);
      setSelected((prev) => {
        const keep = new Set(nextItems.map((it) => keyOf(it)));
        const next = new Set<string>();
        for (const k of prev) if (keep.has(k)) next.add(k);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [keyOf]);

  React.useEffect(() => {
    load();
  }, [load]);

  useSystemRealtimeRefresh(load);

  const reviewBulk = async (payload: { items: Array<{ userId: string; fileId: string }>; action: "approve" | "reject"; reason?: string }) => {
    const res = await fetch("/api/system/admin/files/review-bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
  };

  const approveAll = async () => {
    if (!items.length) return;
    setBusyKey("ALL");
    setError(null);
    try {
      await reviewBulk({
        items: items.map((it) => ({ userId: it.user_id, fileId: it.file_id })),
        action: "approve"
      });
      setSelected(new Set());
      await load();
      dispatchSystemRealtime({ table: "file_access_requests", action: "update" });
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyKey(null);
    }
  };

  const reviewOne = async (it: RequestItem, action: "approve" | "reject") => {
    const k = keyOf(it);
    setBusyKey(k);
    setError(null);
    try {
      await reviewBulk({
        items: [{ userId: it.user_id, fileId: it.file_id }],
        action,
        reason: action === "reject" ? rejectReason[k] || undefined : undefined
      });
      setRejectReason((p) => ({ ...p, [k]: "其他" }));
      await load();
      dispatchSystemRealtime({ table: "file_access_requests", action: "update" });
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyKey(null);
    }
  };

  const reviewSelected = async (action: "approve" | "reject") => {
    if (!selectedItems.length) return;
    setBusyKey("BULK");
    setError(null);
    try {
      await reviewBulk({
        items: selectedItems.map((it) => ({ userId: it.user_id, fileId: it.file_id })),
        action,
        reason: action === "reject" ? bulkRejectReason : undefined
      });
      setSelected(new Set());
      setBulkRejectReason("其他");
      await load();
      dispatchSystemRealtime({ table: "file_access_requests", action: "update" });
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleSelected = (it: RequestItem) => {
    const k = keyOf(it);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const it of filtered) next.delete(keyOf(it));
      } else {
        for (const it of filtered) next.add(keyOf(it));
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
        <div>
          <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "文件权限审批" : "File access requests"}</div>
          <div className="mt-2 text-white/60 text-sm">
            {locale === "zh"
              ? "处理学员文件权限申请（支持筛选、多选批量）。"
              : "Review student file access requests (filters and bulk actions)."}
          </div>
        </div>
        <button
          type="button"
          disabled={busyKey === "ALL" || !items.length}
          onClick={approveAll}
          className="ml-auto px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
        >
          {locale === "zh" ? "一键通过全部" : "Approve all"}
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold">
          {locale === "zh" ? "待审批列表" : "Pending list"}
        </div>

        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center gap-2">
          <input
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            placeholder={locale === "zh" ? "搜索学员：姓名/邮箱/手机" : "Search student: name/email/phone"}
          />
          <input
            value={filterFile}
            onChange={(e) => setFilterFile(e.target.value)}
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            placeholder={locale === "zh" ? "搜索文件：分类/名称" : "Search file: category/name"}
          />
          <button
            type="button"
            disabled={!selectedItems.length || busyKey === "BULK"}
            onClick={() => reviewSelected("approve")}
            className="px-3 py-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50"
          >
            {locale === "zh" ? `通过已选 (${selectedItems.length})` : `Approve (${selectedItems.length})`}
          </button>
          <button
            type="button"
            disabled={!selectedItems.length || busyKey === "BULK"}
            onClick={() => reviewSelected("reject")}
            className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
          >
            {locale === "zh" ? `拒绝已选 (${selectedItems.length})` : `Reject (${selectedItems.length})`}
          </button>
          <select
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value as RejectionReason)}
            className="min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {locale === "zh" ? `拒绝原因：${r}` : `Reason: ${r}`}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-6 text-white/60">{locale === "zh" ? "加载中..." : "Loading..."}</div>
        ) : null}
        {!loading && !filtered.length ? (
          <div className="p-6 text-white/60">{locale === "zh" ? "暂无申请" : "No requests"}</div>
        ) : null}

        <div className="divide-y divide-white/10">
          {pageItems.map((it) => {
            const k = keyOf(it);
            const baseName = it.user?.full_name || it.user?.email || it.user_id;
            const supportLabel = it.user?.support_name ? `（${it.user.support_name}）` : "";
            const userLabel = `${baseName}${supportLabel}`;
            const userContact = [it.user?.email, it.user?.phone].filter(Boolean).join(" · ");
            const fileLabel = `${it.file?.category || ""} ${it.file?.name || ""}`.trim() || it.file_id;
            return (
              <div key={k} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(k)}
                    onChange={() => toggleSelected(it)}
                    className="h-4 w-4 accent-sky-400"
                    aria-label="select"
                  />
                  <div className="text-white/90 font-semibold whitespace-nowrap">{userLabel}</div>
                  <div className="text-xs text-white/50">{userContact ? `· ${userContact}` : ""}</div>
                  <div className="ml-auto text-xs text-white/50">
                    <ClientDateTime value={it.requested_at} />
                  </div>
                </div>
                <div className="mt-2 text-sm text-white/75">{fileLabel}</div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyKey === k}
                    onClick={() => reviewOne(it, "approve")}
                    className="px-3 py-1.5 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50"
                  >
                    {locale === "zh" ? "通过" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === k}
                    onClick={() => reviewOne(it, "reject")}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                  >
                    {locale === "zh" ? "拒绝" : "Reject"}
                  </button>
                  <select
                    value={(rejectReason[k] || "其他") as RejectionReason}
                    onChange={(e) => setRejectReason((p) => ({ ...p, [k]: e.target.value }))}
                    className="ml-auto min-w-[240px] rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/85"
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {locale === "zh" ? `拒绝原因：${r}` : `Reason: ${r}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-2 text-xs text-white/50">
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          >
            {allFilteredSelected
              ? locale === "zh"
                ? "取消全选"
                : "Clear all"
              : locale === "zh"
                ? "全选当前"
                : "Select all"}
          </button>
          <span className="ml-auto">
            {locale === "zh" ? "当前显示" : "Showing"} {pageItems.length} ·{" "}
            {locale === "zh" ? "已选" : "Selected"} {selectedItems.length}
          </span>
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
      </div>
    </div>
  );
}


