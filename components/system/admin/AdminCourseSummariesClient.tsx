"use client";

import React from "react";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PreviewModal } from "@/components/system/PreviewModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type UserInfo = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  support_name?: string | null;
  assistant_name?: string | null;
  coach_name?: string | null;
};

type SummaryItem = {
  id: string;
  user_id: string;
  course_id: number;
  content_html?: string | null;
  content_md?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  user?: UserInfo | null;
};

export function AdminCourseSummariesClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<SummaryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<{ name: string; url: string } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/course-notes/list", { cache: "no-store" });
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

  const markReviewed = async (noteId: string, withNote: boolean) => {
    const note = (notes[noteId] || "").trim();
    if (withNote && !note) {
      setError(locale === "zh" ? "\u8bf7\u8f93\u5165\u5ba1\u6279\u5185\u5bb9" : "Review note required.");
      return;
    }
    const ok = window.confirm(
      locale === "zh" ? "\u786e\u8ba4\u63d0\u4ea4\u5ba1\u6279\uff1f" : "Submit review?"
    );
    if (!ok) return;
    setBusyId(noteId);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/course-notes/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ noteId, reviewNote: note || undefined })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      setNotes((prev) => ({ ...prev, [noteId]: "" }));
      setItems((prev) =>
        prev.map((item) =>
          item.id === noteId
            ? {
                ...item,
                reviewed_at: new Date().toISOString(),
                review_note: note || item.review_note
              }
            : item
        )
      );
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyId(null);
    }
  };

  const markAllReviewed = async () => {
    if (bulkBusy) return;
    const pending = items.filter((it) => !it.reviewed_at && it.submitted_at).length;
    if (!pending) return;
    const ok = window.confirm(locale === "zh" ? "确认一键标记为已阅？" : "Mark all as reviewed?");
    if (!ok) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/course-notes/review-bulk", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBulkBusy(false);
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

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(filtered, {
    deps: [filter]
  });
  const pendingCount = React.useMemo(
    () => items.filter((it) => !it.reviewed_at && it.submitted_at).length,
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "\u8bfe\u7a0b\u603b\u7ed3\u5ba1\u6279" : "Course Summaries"}
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "\u67e5\u770b\u5b66\u5458\u603b\u7ed3\u5e76\u6807\u8bb0\u5df2\u9605\u6216\u63d0\u4ea4\u5ba1\u6279\u5185\u5bb9\u3002"
            : "Review course summaries and send feedback."}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "\u641c\u7d22\uff1a\u59d3\u540d/\u90ae\u7bb1" : "Search: name/email"}
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
          {locale === "zh" ? "\u52a0\u8f7d\u4e2d..." : "Loading..."}
        </div>
      ) : null}

      {!loading && !filtered.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "\u6682\u65e0\u63d0\u4ea4" : "No submissions."}
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((it) => {
          const reviewed = Boolean(it.reviewed_at);
          const status = reviewed ? (locale === "zh" ? "已阅" : "Reviewed") : locale === "zh" ? "待阅" : "Pending";
          const statusClass = reviewed ? "text-emerald-300" : "text-amber-200";
          const baseName = it.user?.full_name || "-";
          const supportLabel = it.user?.support_name ? `（${it.user.support_name}）` : "";
          const name = `${baseName}${supportLabel}`;
          const email = it.user?.email || "-";
          const html = it.content_html || "";
          const text = it.content_md || "";
          const onSummaryDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target instanceof HTMLImageElement && target.src) {
              setPreview({ name: target.alt || "summary", url: target.src });
            }
          };

          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold whitespace-nowrap">
                  <span className="system-name">{name}</span>
                </div>
                <div className="text-xs text-white/60">{email}</div>
                <div className="text-xs text-white/50">
                  {locale === "zh" ? `\u7b2c${it.course_id}\u8bfe` : `Lesson ${it.course_id}`}
                </div>
                <div className={`text-xs ${statusClass}`}>{status}</div>
                <div className="ml-auto text-xs text-white/50">
                  <ClientDateTime value={it.submitted_at} />
                </div>
              </div>

              <div
                className="rounded-2xl border border-white/10 bg-white/5 p-4 max-h-[260px] overflow-y-auto overflow-x-hidden"
                onDoubleClick={onSummaryDoubleClick}
              >
                {html ? (
                  <div
                    className="summary-preview break-words text-sm text-white/80"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <div className="text-sm text-white/80 whitespace-pre-wrap">{text || "-"}</div>
                )}
              </div>

              {it.review_note ? (
                <div className="text-xs text-white/65">
                  {locale === "zh" ? "\u5ba1\u6279\u5185\u5bb9" : "Review note"}: {it.review_note}
                </div>
              ) : null}

              <textarea
                value={notes[it.id] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [it.id]: e.target.value }))}
                className="w-full min-h-[90px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                placeholder={locale === "zh" ? "\u8f93\u5165\u5ba1\u6279\u5185\u5bb9..." : "Write a review note..."}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === it.id || reviewed}
                  onClick={() => markReviewed(it.id, false)}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50",
                    reviewed
                      ? "border-white/10 bg-white/5 text-white/40"
                      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  ].join(" ")}
                >
                  {locale === "zh" ? "\u5df2\u9605" : "Mark reviewed"}
                </button>
                <button
                  type="button"
                  disabled={busyId === it.id || reviewed}
                  onClick={() => markReviewed(it.id, true)}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50",
                    reviewed
                      ? "border-white/10 bg-white/5 text-white/40"
                      : "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                  ].join(" ")}
                >
                  {locale === "zh" ? "\u63d0\u4ea4\u5ba1\u6279" : "Submit review"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && filtered.length ? (
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
        file={preview ? { name: preview.name, url: preview.url, mimeType: "image" } : null}
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
