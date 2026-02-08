"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import { useSearchParams } from "next/navigation";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { PreviewModal } from "@/components/system/PreviewModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type UserInfo = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  leader_id?: string | null;
};

type LeaderOption = { id: string; full_name: string | null; email: string | null };

type WeeklySummaryAdminItem = {
  id: string;
  user_id: string;
  leader_id: string | null;
  student_name: string;
  summary_text: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  strategy_url?: string | null;
  strategy_name?: string | null;
  strategy_mime_type?: string | null;
  curve_url?: string | null;
  curve_name?: string | null;
  curve_mime_type?: string | null;
  stats_url?: string | null;
  stats_name?: string | null;
  stats_mime_type?: string | null;
  user?: UserInfo | null;
};

export function AdminWeeklySummariesClient({
  locale,
  roleFilter
}: {
  locale: "zh" | "en";
  roleFilter: "student" | "leader" | "assistant";
}) {
  const searchParams = useSearchParams();
  const coachId = searchParams?.get("coachId") || "";
  const [items, setItems] = React.useState<WeeklySummaryAdminItem[]>([]);
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [leaderId, setLeaderId] = React.useState("");
  const [role, setRole] = React.useState<"leader" | "super_admin" | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; url: string; mimeType?: string | null } | null>(
    null
  );
  const [reviewTarget, setReviewTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [reviewDraft, setReviewDraft] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        const r = json?.ok ? String(json.user?.role || "") : "";
        if (r === "super_admin") setRole("super_admin");
        else if (r === "leader") setRole("leader");
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
      const qs = new URLSearchParams();
      qs.set("role", roleFilter);
      if (coachId && roleFilter === "student") qs.set("coachId", coachId);
      if (leaderId) qs.set("leaderId", leaderId);
      const res = await fetch(`/api/system/admin/weekly-summaries/list?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
      setLeaders(Array.isArray(json.leaders) ? json.leaders : []);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [coachId, leaderId, roleFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  useSystemRealtimeRefresh(load);

  const markReviewed = async (entryId: string, note?: string) => {
    setBusyId(entryId);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/weekly-summaries/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, reviewNote: note?.trim() || undefined })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusyId(null);
    }
  };


  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const hay = `${it.student_name || ""} ${it.user?.full_name || ""} ${it.user?.email || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, query]);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(filtered, {
    deps: [query, leaderId, coachId]
  });

  const isAssistant = roleFilter === "assistant";
  const assistantLabels = [
    { zh: "招聘数据", en: "Recruiting data" },
    { zh: "学员数据", en: "Student data" },
    { zh: "云电脑数据", en: "Cloud PC data" }
  ];
  const title =
    roleFilter === "leader"
      ? locale === "zh"
        ? "团队长周总结管理"
        : "Leader Weekly Summaries"
      : roleFilter === "assistant"
        ? locale === "zh"
          ? "助教周总结管理"
          : "Assistant Weekly Summaries"
        : locale === "zh"
          ? "学员周总结管理"
          : "Student Weekly Summaries";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{title}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "查看周总结并标记已阅。"
            : "Review weekly summaries and mark as reviewed."}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "搜索：姓名/邮箱" : "Search: name/email"}
        />
        {role === "super_admin" && roleFilter !== "leader" ? (
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="">{locale === "zh" ? "全部团队长" : "All leaders"}</option>
            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.full_name || leader.email || leader.id.slice(0, 6)}
              </option>
            ))}
          </select>
        ) : null}
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
          {locale === "zh" ? "暂无记录" : "No submissions."}
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((it) => {
          const reviewed = Boolean(it.reviewed_at);
          const status = reviewed ? (locale === "zh" ? "已阅" : "Reviewed") : locale === "zh" ? "待阅" : "Pending";
          const statusClass = reviewed ? "text-emerald-300" : "text-amber-200";
          const name = it.user?.full_name || it.student_name || "-";
          const email = it.user?.email || "-";
          const summaryText = it.summary_text?.trim();
          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold whitespace-nowrap">
                  <span className="system-name">{name}</span>
                </div>
                <div className="text-xs text-white/60">{email}</div>
                <div className={`text-xs ${statusClass}`}>{status}</div>
                <div className="ml-auto text-xs text-white/50">
                  <span>{locale === "zh" ? "上传时间：" : "Uploaded: "}</span>
                  <ClientDateTime value={it.created_at} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  isAssistant
                    ? {
                        label: locale === "zh" ? assistantLabels[0].zh : assistantLabels[0].en,
                        url: it.strategy_url,
                        name: it.strategy_name,
                        mimeType: it.strategy_mime_type
                      }
                    : {
                        label: locale === "zh" ? "策略" : "Strategy",
                        url: it.strategy_url,
                        name: it.strategy_name,
                        mimeType: it.strategy_mime_type
                      },
                  isAssistant
                    ? {
                        label: locale === "zh" ? assistantLabels[1].zh : assistantLabels[1].en,
                        url: it.curve_url,
                        name: it.curve_name,
                        mimeType: it.curve_mime_type
                      }
                    : {
                        label: locale === "zh" ? "本周曲线" : "Weekly curve",
                        url: it.curve_url,
                        name: it.curve_name,
                        mimeType: it.curve_mime_type
                      },
                  isAssistant
                    ? {
                        label: locale === "zh" ? assistantLabels[2].zh : assistantLabels[2].en,
                        url: it.stats_url,
                        name: it.stats_name,
                        mimeType: it.stats_mime_type
                      }
                    : {
                        label: locale === "zh" ? "统计" : "Stats",
                        url: it.stats_url,
                        name: it.stats_name,
                        mimeType: it.stats_mime_type
                      }
                ].map((img) => {
                  const showDownload = isAssistant && Boolean(img.url);
                  return (
                    <div key={img.label} className={showDownload ? "space-y-2" : ""}>
                      <button
                        type="button"
                        disabled={!img.url}
                        onClick={() =>
                          img.url && setPreview({ url: img.url, name: img.name || img.label, mimeType: img.mimeType })
                        }
                        className="group relative h-[140px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                      >
                        {img.url ? (
                          isAssistant ? (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-white/70">
                              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                {locale === "zh" ? "点击预览" : "Preview"}
                              </div>
                              <div className="max-w-[160px] truncate text-white/60">{img.name || img.label}</div>
                            </div>
                          ) : (
                            <img src={img.url} alt={img.name || img.label} className="h-full w-full object-cover" />
                          )
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                            {locale === "zh" ? "无预览" : "No preview"}
                          </div>
                        )}
                        <div className="absolute left-2 top-2 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white/80">
                          {img.label}
                        </div>
                      </button>
                      {showDownload ? (
                        <a
                          href={img.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        >
                          {locale === "zh" ? "下载" : "Download"}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="text-sm text-white/85 whitespace-pre-wrap">
                  {summaryText ? summaryText : locale === "zh" ? "无总结" : "No summary"}
                </div>
                {it.review_note ? (
                  <div className="text-xs text-white/60">
                    {locale === "zh" ? "审核备注" : "Review note"}: {it.review_note}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === it.id || reviewed}
                  onClick={() => {
                    setReviewTarget({ id: it.id, name });
                    setReviewDraft("");
                  }}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50",
                    reviewed
                      ? "border-white/10 bg-white/5 text-white/40"
                      : "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20"
                  ].join(" ")}
                >
                  {locale === "zh" ? "审核" : "Review"}
                </button>
                <button
                  type="button"
                  disabled={busyId === it.id || reviewed}
                  onClick={() => markReviewed(it.id)}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50",
                    reviewed
                      ? "border-white/10 bg-white/5 text-white/40"
                      : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                  ].join(" ")}
                >
                  {locale === "zh" ? "已阅" : "Mark reviewed"}
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

      {reviewTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-[720px] rounded-3xl border border-white/10 bg-[#050a14] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-white/90 font-semibold">
                {locale === "zh" ? "周总结审批" : "Weekly summary review"}
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "关闭" : "Close"}
              </button>
            </div>
            <div className="mt-2 text-xs text-white/60">{reviewTarget.name}</div>
            <textarea
              value={reviewDraft}
              onChange={(e) => setReviewDraft(e.target.value)}
              className="mt-4 w-full min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
              placeholder={locale === "zh" ? "填写审核意见（可选）" : "Write an approval note (optional)"}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReviewTarget(null);
                  setReviewDraft("");
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={busyId === reviewTarget.id}
                onClick={async () => {
                  await markReviewed(reviewTarget.id, reviewDraft);
                  setReviewTarget(null);
                  setReviewDraft("");
                }}
                className="ml-auto px-3 py-1.5 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {busyId === reviewTarget.id
                  ? locale === "zh"
                    ? "提交中..."
                    : "Submitting..."
                  : locale === "zh"
                    ? "提交审核"
                    : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PreviewModal
        file={preview ? { name: preview.name, url: preview.url, mimeType: preview.mimeType || undefined } : null}
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}


