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
  leader_id?: string | null;
};

type LeaderOption = { id: string; full_name: string | null; email: string | null };

type ClassicTradeAdminItem = {
  id: string;
  user_id: string;
  leader_id: string | null;
  reason: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  image_name?: string | null;
  user?: UserInfo | null;
};

export function AdminClassicTradesClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<ClassicTradeAdminItem[]>([]);
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");
  const [leaderId, setLeaderId] = React.useState("");
  const [role, setRole] = React.useState<"leader" | "super_admin" | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [preview, setPreview] = React.useState<{ name: string; url: string } | null>(null);

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
      const qs = leaderId ? `?leaderId=${encodeURIComponent(leaderId)}` : "";
      const res = await fetch(`/api/system/admin/classic-trades/list${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
      setLeaders(Array.isArray(json.leaders) ? json.leaders : []);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [leaderId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const markReviewed = async (entryId: string, withNote: boolean) => {
    const note = (notes[entryId] || "").trim();
    if (withNote && !note) {
      setError(locale === "zh" ? "\u8bf7\u8f93\u5165\u5ba1\u6279\u5185\u5bb9" : "Review note required.");
      return;
    }
    const ok = window.confirm(
      locale === "zh" ? "\u786e\u8ba4\u63d0\u4ea4\u5ba1\u6279\uff1f" : "Submit review?"
    );
    if (!ok) return;
    setBusyId(entryId);
    setError(null);
    try {
      const res = await fetch("/api/system/admin/classic-trades/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, reviewNote: note || undefined })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      setNotes((prev) => ({ ...prev, [entryId]: "" }));
      await load();
    } catch (e: any) {
      setError(e?.message || "update_failed");
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

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(filtered, {
    deps: [filter, leaderId]
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "\u7ecf\u5178\u4ea4\u6613\u7ba1\u7406" : "Classic Trades"}
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "\u67e5\u770b\u5b66\u5458\u63d0\u4ea4\u7684\u7ecf\u5178\u4ea4\u6613\u5e76\u8fdb\u884c\u5ba1\u6279\u3002"
            : "Review student classic trade submissions."}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          placeholder={locale === "zh" ? "\u641c\u7d22\uff1a\u59d3\u540d/\u90ae\u7bb1" : "Search: name/email"}
        />
        {role === "super_admin" ? (
          <select
            value={leaderId}
            onChange={(e) => setLeaderId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          >
            <option value="">{locale === "zh" ? "\u5168\u90e8\u56e2\u961f\u957f" : "All leaders"}</option>
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
          const name = it.user?.full_name || "-";
          const email = it.user?.email || "-";
          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold whitespace-nowrap">
                  <span className="system-name">{name}</span>
                </div>
                <div className="text-xs text-white/60">{email}</div>
                <div className={`text-xs ${statusClass}`}>{status}</div>
                <div className="ml-auto text-xs text-white/50">
                  <ClientDateTime value={it.created_at} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <button
                  type="button"
                  disabled={!it.image_url}
                  onClick={() =>
                    it.image_url && setPreview({ name: it.image_name || "Preview", url: it.image_url })
                  }
                  className="group relative h-[140px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.image_name || "preview"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                      {locale === "zh" ? "\u65e0\u9884\u89c8" : "No preview"}
                    </div>
                  )}
                </button>
                <div className="space-y-3">
                  <div className="text-sm text-white/85 whitespace-pre-wrap">{it.reason}</div>
                  {it.review_note ? (
                    <div className="text-xs text-white/65">
                      {locale === "zh" ? "\u5ba1\u6279\u5185\u5bb9" : "Review note"}: {it.review_note}
                    </div>
                  ) : null}

                  <textarea
                    value={notes[it.id] || ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [it.id]: e.target.value }))}
                    className="w-full min-h-[80px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
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
