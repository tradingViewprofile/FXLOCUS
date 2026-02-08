"use client";

import React from "react";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type RecipientOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export function NotificationsClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [meRole, setMeRole] = React.useState<"leader" | "super_admin" | null>(null);
  const [recipients, setRecipients] = React.useState<RecipientOption[]>([]);
  const [recipientQuery, setRecipientQuery] = React.useState("");
  const [globalContent, setGlobalContent] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [targetContent, setTargetContent] = React.useState("");
  const [globalError, setGlobalError] = React.useState("");
  const [globalNotice, setGlobalNotice] = React.useState("");
  const [targetError, setTargetError] = React.useState("");
  const [targetNotice, setTargetNotice] = React.useState("");
  const [sendingGlobal, setSendingGlobal] = React.useState(false);
  const [sendingTarget, setSendingTarget] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  const load = React.useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    const res = await fetch("/api/system/notifications/list");
    const json = await res.json().catch(() => null);
    setItems(Array.isArray(json?.items) ? json.items : []);
    if (withSpinner) setLoading(false);
  }, []);

  React.useEffect(() => {
    let alive = true;
    let lastRefresh = 0;
    const refresh = async () => {
      if (!alive || document.hidden) return;
      const now = Date.now();
      if (now - lastRefresh < 15_000) return;
      lastRefresh = now;
      await load();
    };

    load(true);
    const pollMs = typeof navigator !== "undefined" && (navigator as any).connection?.saveData ? 90_000 : 45_000;
    const id = window.setInterval(refresh, pollMs);
    const onFocus = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && json?.ok) {
          setUserId(String(json.user?.id || ""));
          const role = String(json.user?.role || "");
          if (role === "leader") setMeRole("leader");
          if (role === "super_admin") setMeRole("super_admin");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isAdmin = meRole === "leader" || meRole === "super_admin";

  React.useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/admin/notifications/recipients");
        const json = await res.json().catch(() => null);
        if (!alive) return;
        setRecipients(Array.isArray(json?.items) ? json.items : []);
      } catch {
        if (!alive) return;
        setRecipients([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const markRead = async (id: string) => {
    await fetch(`/api/system/notifications/${id}/read`, { method: "POST" });
    load();
  };

  const markAllRead = async () => {
    if (markingAll) return;
    const ok = window.confirm(locale === "zh" ? "确认全部标记为已读？" : "Mark all as read?");
    if (!ok) return;
    setMarkingAll(true);
    await fetch("/api/system/notifications/read-all", { method: "POST" });
    await load();
    setMarkingAll(false);
  };

  const roleLabel = React.useCallback(
    (role: string | null) => {
      const key = String(role || "");
      if (locale === "zh") {
        if (key === "student") return "学员";
        if (key === "trader") return "交易员";
        if (key === "coach") return "教练";
        if (key === "leader") return "团队长";
        return "其他";
      }
      if (key === "student") return "Student";
      if (key === "trader") return "Trader";
      if (key === "coach") return "Coach";
      if (key === "leader") return "Leader";
      return "Other";
    },
    [locale]
  );

  const filteredRecipients = React.useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const name = String(r.full_name || "");
      const email = String(r.email || "");
      const role = roleLabel(r.role);
      const hay = `${name} ${email} ${role} ${r.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [recipients, recipientQuery, roleLabel]);

  const sendGlobal = async () => {
    const content = globalContent.trim();
    if (!content) return;
    const ok = window.confirm(locale === "zh" ? "确认发送全局通知？" : "Send global notice?");
    if (!ok) return;
    setGlobalError("");
    setGlobalNotice("");
    setSendingGlobal(true);
    try {
      const res = await fetch("/api/system/admin/notifications/send-global", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: locale === "zh" ? "全局通知" : "Global notice",
          content
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "send_failed");
      setGlobalContent("");
      setGlobalNotice(locale === "zh" ? "已发送全局通知" : "Global notice sent");
    } catch (e: any) {
      setGlobalError(e?.message || "send_failed");
    } finally {
      setSendingGlobal(false);
    }
  };

  const sendTarget = async () => {
    const content = targetContent.trim();
    if (!targetId || !content) return;
    const ok = window.confirm(locale === "zh" ? "确认发送单独通知？" : "Send this notice?");
    if (!ok) return;
    setTargetError("");
    setTargetNotice("");
    setSendingTarget(true);
    try {
      const res = await fetch("/api/system/admin/notifications/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userIds: [targetId],
          title: locale === "zh" ? "单独通知" : "Direct notice",
          content
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "send_failed");
      setTargetContent("");
      setTargetId("");
      setTargetNotice(locale === "zh" ? "已发送单独通知" : "Notice sent");
    } catch (e: any) {
      setTargetError(e?.message || "send_failed");
    } finally {
      setSendingTarget(false);
    }
  };

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(items);

  return (
    <div className={`space-y-6 ${isAdmin ? "max-w-[1200px]" : "max-w-[900px]"}`}>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "通知" : "Notifications"}</div>
          <button
            type="button"
            disabled={markingAll || !items.some((n) => !n.read_at)}
            onClick={markAllRead}
            className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            {markingAll
              ? locale === "zh"
                ? "处理中..."
                : "Processing..."
              : locale === "zh"
                ? "一键已读"
                : "Mark all read"}
          </button>
        </div>
      </div>

      <div className={isAdmin ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
        <div className="space-y-6">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
              {locale === "zh" ? "加载中..." : "Loading..."}
            </div>
          ) : null}

          {!loading && !items.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
              {locale === "zh" ? "暂无消息。" : "No messages."}
            </div>
          ) : null}

          <div className="space-y-3">
            {pageItems.map((n) => (
              <div key={n.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2">
                  <div className="text-white/90 font-semibold">{n.title}</div>
                  <div className="ml-auto text-xs text-white/50">
                    <ClientDateTime value={n.created_at} />
                  </div>
                </div>
                <div className="mt-2 text-white/70 leading-7 whitespace-pre-wrap">{n.content}</div>
                <div className="mt-4">
                  {n.read_at ? (
                    <span className="text-xs text-white/50">{locale === "zh" ? "已读" : "Read"}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                    >
                      {locale === "zh" ? "标记已读" : "Mark as read"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!loading && items.length ? (
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
        </div>

        {isAdmin ? (
          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <div className="text-white/90 font-semibold">{locale === "zh" ? "全局通知" : "Global notice"}</div>
              <div className="text-xs text-white/55">
                {locale === "zh"
                  ? "发送给当前名下的学员、教练、交易员、团队长。"
                  : "Send to all students, coaches, traders, and leaders under your scope."}
              </div>
              <textarea
                value={globalContent}
                onChange={(e) => setGlobalContent(e.target.value)}
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                placeholder={locale === "zh" ? "输入通知内容..." : "Write a notice..."}
              />
              <button
                type="button"
                disabled={sendingGlobal || !globalContent.trim()}
                onClick={sendGlobal}
                className="w-full px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-100 hover:bg-sky-500/20 disabled:opacity-50"
              >
                {sendingGlobal ? (locale === "zh" ? "发送中..." : "Sending...") : locale === "zh" ? "通知全部" : "Notify all"}
              </button>
              {globalNotice ? <div className="text-xs text-emerald-200/80">{globalNotice}</div> : null}
              {globalError ? <div className="text-xs text-rose-200/80">{globalError}</div> : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <div className="text-white/90 font-semibold">{locale === "zh" ? "独立通知" : "Direct notice"}</div>
              <input
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                placeholder={locale === "zh" ? "搜索学员/教练/交易员/团队长" : "Search recipient"}
              />
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
              >
                <option value="">{locale === "zh" ? "选择接收对象" : "Select recipient"}</option>
                {filteredRecipients.map((r) => {
                  const label = r.full_name || r.email || r.id.slice(0, 6);
                  return (
                    <option key={r.id} value={r.id}>
                      {label} · {roleLabel(r.role)}
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-white/50">
                {locale === "zh" ? `共 ${filteredRecipients.length} 人` : `${filteredRecipients.length} recipients`}
              </div>
              <textarea
                value={targetContent}
                onChange={(e) => setTargetContent(e.target.value)}
                className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                placeholder={locale === "zh" ? "输入通知内容..." : "Write a notice..."}
              />
              <button
                type="button"
                disabled={sendingTarget || !targetId || !targetContent.trim()}
                onClick={sendTarget}
                className="w-full px-3 py-2 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-100 hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {sendingTarget ? (locale === "zh" ? "发送中..." : "Sending...") : locale === "zh" ? "发送通知" : "Send"}
              </button>
              {targetNotice ? <div className="text-xs text-emerald-200/80">{targetNotice}</div> : null}
              {targetError ? <div className="text-xs text-rose-200/80">{targetError}</div> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
