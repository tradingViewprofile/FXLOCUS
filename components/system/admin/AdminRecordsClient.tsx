"use client";

import React from "react";
import sanitizeHtml from "sanitize-html";

import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";
import { dispatchSystemRealtime } from "@/lib/system/realtime";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type RecordRow = {
  id: string;
  type: string | null;
  created_at: string | null;
  email: string | null;
  name: string | null;
  payload: Record<string, unknown> | null;
  content: string | null;
  read_at?: string | null;
};

function parsePayload(row: RecordRow): Record<string, unknown> {
  if (row.payload && typeof row.payload === "object") return row.payload;
  if (row.content) {
    try {
      const parsed = JSON.parse(row.content) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function sanitizeHtmlContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "img",
      "a",
      "span",
      "div"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"]
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noreferrer"
        }
      })
    }
  }).trim();
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.trim() || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") {
    const anyVal = value as Record<string, unknown>;
    if (typeof anyVal.e164 === "string" && anyVal.e164) return anyVal.e164;
    return JSON.stringify(value);
  }
  return String(value);
}

function pickFirstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function formatTime(value: string | null | undefined, locale: "zh" | "en") {
  if (!value) return "-";
  return (
    <ClientDateTime
      value={value}
      fallback={value}
      formatter={(date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const hh = String(date.getHours()).padStart(2, "0");
        const min = String(date.getMinutes()).padStart(2, "0");
        return locale === "zh"
          ? `${yyyy}年${mm}月${dd}号  时间：${hh}:${min}`
          : `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }}
    />
  );
}

type DetailItem = {
  key: string;
  label: string;
  value: string;
  html?: boolean;
};

function buildDetails(
  payload: Record<string, unknown>,
  type: "donate" | "contact" | "enrollment",
  locale: "zh" | "en"
): DetailItem[] {
  const labels: Record<string, string> = {
    name: locale === "zh" ? "姓名" : "Name",
    email: "Email",
    wechat: locale === "zh" ? "微信" : "WeChat",
    phone: locale === "zh" ? "手机号" : "Phone",
    intent: locale === "zh" ? "意向" : "Intent",
    bottleneck: locale === "zh" ? "瓶颈" : "Bottleneck",
    instruments: locale === "zh" ? "交易品种" : "Instruments",
    message: locale === "zh" ? "留言" : "Message",
    price: locale === "zh" ? "捐赠金额" : "Donation",
    amount: locale === "zh" ? "捐赠金额" : "Donation",
    program: locale === "zh" ? "报名项目" : "Program",
    channel: locale === "zh" ? "渠道" : "Channel",
    receivedAt: locale === "zh" ? "提交时间" : "Submitted at"
  };

  const order =
    type === "donate"
      ? ["name", "email", "wechat", "price", "amount", "message", "receivedAt"]
      : type === "contact"
        ? ["name", "email", "wechat", "phone", "intent", "bottleneck", "instruments", "message", "receivedAt"]
        : ["name", "email", "wechat", "phone", "program", "message", "receivedAt"];

  const picked = new Set(order);
  const items = order
    .map((key) => ({ key, value: payload[key] }))
    .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== "");

  const extra = Object.keys(payload)
    .filter((key) => !picked.has(key) && key !== "raw")
    .map((key) => ({ key, value: payload[key] }))
    .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== "");

  const timeKeys = new Set(["receivedAt", "createdAt", "submittedAt", "created_at", "submitted_at"]);
  return [...items, ...extra].map((item) => {
    const isHtml = /html$/i.test(item.key);
    const rawValue =
      typeof item.value === "string" && timeKeys.has(item.key)
        ? formatTime(item.value, locale)
        : formatValue(item.value);
    const value = isHtml ? sanitizeHtmlContent(String(rawValue)) : String(rawValue);
    return {
      key: item.key,
      label: labels[item.key] || item.key,
      value,
      html: isHtml
    };
  });
}

export function AdminRecordsClient({
  locale,
  type,
  title
}: {
  locale: "zh" | "en";
  type: "donate" | "contact" | "enrollment";
  title: string;
}) {
  const [items, setItems] = React.useState<RecordRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<RecordRow | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [markingId, setMarkingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/system/admin/records/list?type=${encodeURIComponent(type)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }, [type]);

  React.useEffect(() => {
    load();
  }, [load]);

  useSystemRealtimeRefresh(load);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(items, {
    deps: [type]
  });

  const activePayload = React.useMemo(() => {
    if (!active) return null;
    const payload = parsePayload(active);
    const name = pickFirstText(payload.name, active.name);
    const email = pickFirstText(payload.email, active.email);
    const receivedAt = pickFirstText(
      payload.receivedAt,
      payload.createdAt,
      payload.submittedAt,
      payload.created_at,
      payload.submitted_at,
      active.created_at
    );
    return {
      ...payload,
      ...(name ? { name } : null),
      ...(email ? { email } : null),
      ...(receivedAt ? { receivedAt } : null)
    };
  }, [active]);
  const activeDetails = React.useMemo(
    () => (activePayload ? buildDetails(activePayload, type, locale) : []),
    [activePayload, locale, type]
  );

  const copyValue = React.useCallback(async (key: string, value: string) => {
    const text = value.trim();
    if (!text || text === "-") return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1400);
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1400);
      } catch {
        // ignore
      }
    }
  }, []);

  const markRead = React.useCallback(
    async (id: string) => {
      if (!id) return;
      setMarkingId(id);
      const optimisticAt = new Date().toISOString();
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, read_at: optimisticAt } : row)));
      try {
        const res = await fetch("/api/system/admin/records/mark-read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "mark_failed");
        setItems((prev) => prev.map((row) => (row.id === id ? { ...row, read_at: optimisticAt } : row)));
        dispatchSystemRealtime({ table: "records", action: "update" });
        await load();
      } catch {
        setItems((prev) => prev.map((row) => (row.id === id ? { ...row, read_at: null } : row)));
        setError(locale === "zh" ? "标记失败，请重试。" : "Mark failed. Please retry.");
      } finally {
        setMarkingId((prev) => (prev === id ? null : prev));
      }
    },
    [load, locale]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{title}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh" ? "仅超管可查看，点击可查看详情。" : "Super admin only. Click to view details."}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">{error}</div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 text-white/85 font-semibold flex items-center gap-2">
          <span>{locale === "zh" ? "列表" : "List"}</span>
          <button
            type="button"
            onClick={load}
            className="ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
          >
            {locale === "zh" ? "刷新" : "Refresh"}
          </button>
        </div>

        {loading ? <div className="p-6 text-white/60">{locale === "zh" ? "加载中..." : "Loading..."}</div> : null}
        {!loading && !items.length ? (
          <div className="p-6 text-white/60">{locale === "zh" ? "暂无数据" : "No items"}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-white/50">
              <tr className="border-b border-white/10">
                <th className="px-6 py-3 text-left !whitespace-nowrap">
                  {locale === "zh" ? "姓名" : "Name"}
                </th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "时间" : "Time"}</th>
                <th className="px-6 py-3 text-left">{locale === "zh" ? "摘要" : "Summary"}</th>
                <th className="px-6 py-3 text-right">{locale === "zh" ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pageItems.map((row) => {
                const payload = parsePayload(row);
                const donateAmount = payload.amount ?? payload.price ?? "-";
                const name = String(payload.name ?? row.name ?? "-");
                const email = String(payload.email ?? row.email ?? "-");
                const wechat = String(payload.wechat ?? "-");
                const intent = String(payload.intent ?? payload.message ?? "-");
                const program = String(payload.program ?? payload.message ?? "-");
                const summary =
                  type === "donate"
                    ? locale === "zh"
                      ? `捐赠金额: ${String(donateAmount)} 元  微信: ${wechat}`
                      : `amount: ${String(donateAmount)} 元  wechat: ${wechat}`
                    : type === "contact"
                      ? intent
                      : program;

                return (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white/80 !whitespace-nowrap">{name}</td>
                    <td className="px-6 py-4 text-white/70">{email}</td>
                    <td className="px-6 py-4 text-white/60">{formatTime(row.created_at, locale)}</td>
                    <td className="px-6 py-4 text-white/60 max-w-[420px] truncate">{summary}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {type === "contact" ? (
                          <button
                            type="button"
                            disabled={Boolean(row.read_at) || markingId === row.id}
                            onClick={() => markRead(row.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                          >
                            {locale === "zh" ? (row.read_at ? "已阅" : "标为已阅") : row.read_at ? "Read" : "Mark read"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setActive(row)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                        >
                          {locale === "zh" ? "查看" : "View"}
                        </button>
                      </div>
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

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-[900px] max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 bg-[#050a14] p-6">
            <div className="flex items-center gap-2">
              <div className="text-white/90 font-semibold">{locale === "zh" ? "详情" : "Details"}</div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="ml-auto px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "关闭" : "Close"}
              </button>
            </div>
            <div className="mt-3 text-xs text-white/50">
              id: {active.id} · {formatTime(active.created_at, locale)}
            </div>
            <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-2">
                {activeDetails.length ? (
                  activeDetails.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/50">{item.label}</div>
                      {item.html ? (
                        <div
                          className="prose prose-invert mt-2 max-w-none text-sm text-white/85"
                          dangerouslySetInnerHTML={{ __html: item.value }}
                        />
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-sm text-white/85 whitespace-pre-wrap break-words">
                          <span className="flex-1">{item.value}</span>
                          {["email", "phone", "wechat"].includes(item.key) ? (
                            <button
                              type="button"
                              onClick={() => copyValue(item.key, item.value)}
                              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                            >
                              {copiedKey === item.key ? (locale === "zh" ? "已复制" : "Copied") : locale === "zh" ? "复制" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    {locale === "zh" ? "暂无详情" : "No detail available."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
