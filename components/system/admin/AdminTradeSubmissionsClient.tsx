"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileText } from "lucide-react";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PreviewModal } from "@/components/system/PreviewModal";
import { saveWithPicker } from "@/lib/downloads/saveWithPicker";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type SubmissionFile = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  url: string | null;
};

type SubmissionItem = {
  id: string;
  user_id: string;
  leader_id: string | null;
  status: "submitted" | "approved" | "rejected";
  rejection_reason?: string | null;
  review_note?: string | null;
  created_at: string;
  user?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  support_name?: string | null;
  files: SubmissionFile[];
};

type Config = {
  titleZh: string;
  titleEn: string;
};

const CONFIG: Record<"trade_log" | "trade_strategy", Config> = {
  trade_log: {
    titleZh: "交易日志审批",
    titleEn: "Trade log reviews"
  },
  trade_strategy: {
    titleZh: "交易策略审批",
    titleEn: "Trade strategy reviews"
  }
};

function bytesToHuman(bytes: number) {
  if (!bytes || bytes < 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function statusLabel(locale: "zh" | "en", status: SubmissionItem["status"]) {
  const zh = { submitted: "已提交", approved: "已阅", rejected: "已拒绝" };
  const en = { submitted: "Submitted", approved: "Reviewed", rejected: "Rejected" };
  return (locale === "zh" ? zh : en)[status] || status;
}

function statusClass(status: SubmissionItem["status"]) {
  if (status === "approved") return "text-emerald-300";
  if (status === "rejected") return "text-rose-300";
  return "text-amber-200";
}

export function AdminTradeSubmissionsClient({
  locale,
  type
}: {
  locale: "zh" | "en";
  type: "trade_log" | "trade_strategy";
}) {
  const cfg = CONFIG[type];
  const searchParams = useSearchParams();
  const coachId = searchParams?.get("coachId") || "";
  const [items, setItems] = React.useState<SubmissionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<SubmissionFile | null>(null);

  const listUrl = React.useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("type", type);
    if (coachId) qs.set("coachId", coachId);
    return `/api/system/admin/trade-submissions/list?${qs.toString()}`;
  }, [coachId, type]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(listUrl, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  React.useEffect(() => {
    load();
  }, [load]);

  const markReviewed = async (submissionId: string) => {
    const note = (notes[submissionId] || "").trim();
    const ok = window.confirm(locale === "zh" ? "确认标记为已阅？" : "Mark as reviewed?");
    if (!ok) return;
    setBusyId(submissionId);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/trade-submissions/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId, note: note || undefined })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      setNotes((prev) => ({ ...prev, [submissionId]: "" }));
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyId(null);
    }
  };

  const markAllReviewed = async () => {
    if (bulkBusy) return;
    const pending = items.filter((it) => it.status === "submitted").length;
    if (!pending) return;
    const ok = window.confirm(locale === "zh" ? "确认一键标记为已阅？" : "Mark all as reviewed?");
    if (!ok) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/trade-submissions/review-bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          coachId: coachId || undefined
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const archive = async (submissionId: string) => {
    const ok = window.confirm(locale === "zh" ? "确认存档该策略？" : "Archive this strategy?");
    if (!ok) return;
    setBusyId(submissionId);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/trade-submissions/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "archive_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "archive_failed");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const hay = `${it.user?.full_name || ""} ${it.user?.email || ""} ${it.user?.phone || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [filter, items]);

  const ordered = React.useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (a.status === b.status) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (a.status === "submitted") return -1;
      if (b.status === "submitted") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [filtered]);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(ordered, {
    deps: [filter, coachId, type]
  });
  const pendingCount = React.useMemo(() => items.filter((it) => it.status === "submitted").length, [items]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? cfg.titleZh : cfg.titleEn}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh" ? "查看学员提交并标记已阅。" : "Review submissions and mark as reviewed."}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "搜索学员：姓名/邮箱/手机" : "Search: name/email/phone"}
        />
        <button
          type="button"
          disabled={bulkBusy || pendingCount === 0}
          onClick={markAllReviewed}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          {bulkBusy
            ? locale === "zh"
              ? "处理中..."
              : "Processing..."
            : locale === "zh"
              ? `一键已阅${pendingCount ? ` (${pendingCount})` : ""}`
              : `Mark all${pendingCount ? ` (${pendingCount})` : ""}`}
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中..." : "Loading..."}
        </div>
      ) : null}

      {!loading && !filtered.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "暂无提交" : "No submissions."}
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((it) => {
          const name = it.user?.full_name || "-";
          const supportLabel = it.support_name ? `（${it.support_name}）` : "";
          const email = it.user?.email || "-";
          const reviewLocked = it.status !== "submitted";
          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold whitespace-nowrap">
                  <span className="system-name">
                    {name}
                    {supportLabel ? (
                      <span className="ml-1 text-xs text-white/55">{supportLabel}</span>
                    ) : null}
                  </span>
                </div>
                <div className="text-xs text-white/60">{email}</div>
                <div className={`text-xs ${statusClass(it.status)}`}>{statusLabel(locale, it.status)}</div>
                <div className="ml-auto text-xs text-white/50">
                  <ClientDateTime value={it.created_at} />
                </div>
              </div>

              {it.review_note ? (
                <div className="text-xs text-white/65">
                  {locale === "zh" ? "审批意见" : "Review note"}: {it.review_note}
                </div>
              ) : null}

              <div className="space-y-2">
                {it.files.map((file) => (
                  <div key={file.id} className="flex flex-wrap items-center gap-2 text-sm text-white/75">
                    <FileText className="h-4 w-4 text-white/60" />
                    <span className="max-w-[360px] truncate">{file.file_name}</span>
                    <span className="text-xs text-white/45">{bytesToHuman(file.size_bytes)}</span>
                    <button
                      type="button"
                      disabled={!file.url}
                      onClick={() => file.url && setPreview(file)}
                      className="ml-auto rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                    >
                      {locale === "zh" ? "预览" : "Preview"}
                    </button>
                    {type === "trade_strategy" ? (
                      <button
                        type="button"
                        disabled={!file.url}
                        onClick={() => {
                          if (!file.url) return;
                          void saveWithPicker({
                            url: `/api/system/trade-submission-files/${file.id}/download`,
                            filename: file.file_name || "strategy",
                            mimeType: file.mime_type || undefined
                          });
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
                      >
                        <Download className="mr-1 inline h-3 w-3" />
                        {locale === "zh" ? "下载" : "Download"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <textarea
                  value={notes[it.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [it.id]: e.target.value }))}
                  disabled={reviewLocked}
                  className="min-h-[72px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 disabled:opacity-60"
                  placeholder={locale === "zh" ? "审批意见（可选）" : "Review note (optional)"}
                />
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
                  <button
                    type="button"
                    disabled={busyId === it.id || reviewLocked}
                    onClick={() => markReviewed(it.id)}
                    className={[
                      "px-3 py-2 rounded-xl border disabled:opacity-50",
                      reviewLocked
                        ? "border-white/10 bg-white/5 text-white/40"
                        : "bg-emerald-400/15 border-emerald-400/30 text-emerald-100 hover:bg-emerald-400/20"
                    ].join(" ")}
                  >
                    {locale === "zh" ? "已阅" : "Reviewed"}
                  </button>
                  {type === "trade_strategy" ? (
                    <button
                      type="button"
                      disabled={busyId === it.id}
                      onClick={() => archive(it.id)}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
                    >
                      {locale === "zh" ? "存档" : "Archive"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && ordered.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5">
          <PaginationControls
            total={total}
            page={page}
            pageSize={pageSize}
            pageCount={pageCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            locale={locale}
          />
        </div>
      ) : null}

      <PreviewModal
        file={
          preview
            ? { name: preview.file_name, url: preview.url, mimeType: preview.mime_type }
            : null
        }
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
