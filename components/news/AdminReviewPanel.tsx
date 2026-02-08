"use client";

import React from "react";

type StatusKey = "pending" | "published" | "rejected";

type AdminArticle = {
  id: string;
  title_en: string | null;
  title_zh: string | null;
  summary_en: string | null;
  summary_zh: string | null;
  category: string;
  importance: string;
  sentiment: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  news_sources?: { name?: string; logo_url?: string } | null;
  news_metrics?: { views?: number; clicks?: number; avg_dwell_seconds?: number } | null;
};

type SourceItem = {
  id: string;
  name: string;
  type: string;
  url: string;
  logo_url?: string | null;
  enabled: boolean;
  content_policy: string;
};

type Report = {
  totals: { views: number; clicks: number; avgDwell: number; ctr: number };
  topArticles: Array<{ title: string; slug?: string; views: number; clicks: number; ctr: number }>;
  categories: Array<{ category: string; views: number; clicks: number; ctr: number }>;
};

const SECRET_KEY = "fxlocus:news:adminSecret";

function toInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function toIso(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function AdminReviewPanel({ locale }: { locale: "zh" | "en" }) {
  const [secret, setSecret] = React.useState("");
  const [status, setStatus] = React.useState<StatusKey>("pending");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<AdminArticle[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [edits, setEdits] = React.useState<Record<string, Partial<AdminArticle>>>({});
  const [batchSchedule, setBatchSchedule] = React.useState("");
  const [sources, setSources] = React.useState<SourceItem[]>([]);
  const [report, setReport] = React.useState<Report | null>(null);
  const [adminError, setAdminError] = React.useState<string | null>(null);
  const [sourceForm, setSourceForm] = React.useState<Partial<SourceItem>>({
    name: "",
    type: "rss",
    url: "",
    logo_url: "",
    enabled: true,
    content_policy: "excerpt_only"
  });

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SECRET_KEY);
      if (stored) setSecret(stored);
    } catch {
      // ignore
    }
  }, []);

  const headers = React.useMemo(
    () => ({
      "content-type": "application/json",
      "x-admin-secret": secret
    }),
    [secret]
  );

  const loadList = React.useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setAdminError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", "1");
      params.set("pageSize", "50");
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/news/list?${params.toString()}`, {
        headers,
        cache: "no-store"
      });
      if (res.status === 401) {
        setAdminError("unauthorized");
        setItems([]);
        return;
      }
      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
      setSelected({});
      setEdits({});
    } finally {
      setLoading(false);
    }
  }, [headers, query, secret, status]);

  const loadSources = React.useCallback(async () => {
    if (!secret) return;
    const res = await fetch("/api/admin/news/sources", { headers, cache: "no-store" });
    if (res.status === 401) {
      setAdminError("unauthorized");
      setSources([]);
      return;
    }
    const json = await res.json();
    setSources(Array.isArray(json.items) ? json.items : []);
  }, [headers, secret]);

  const loadReport = React.useCallback(async () => {
    if (!secret) return;
    const res = await fetch("/api/admin/news/report", { headers, cache: "no-store" });
    if (res.status === 401) {
      setAdminError("unauthorized");
      setReport(null);
      return;
    }
    const json = await res.json();
    setReport(json || null);
  }, [headers, secret]);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  React.useEffect(() => {
    loadSources();
    loadReport();
  }, [loadReport, loadSources]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateEdit = (id: string, patch: Partial<AdminArticle>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const saveArticle = async (id: string) => {
    const updates = { ...(edits[id] || {}) } as Record<string, unknown>;
    if (!updates) return;
    if (Object.prototype.hasOwnProperty.call(updates, "scheduled_at")) {
      updates.scheduled_at = toIso(updates.scheduled_at as string | null);
    }
    await fetch("/api/admin/news/review", {
      method: "POST",
      headers,
      body: JSON.stringify({ articleId: id, updates })
    });
    await loadList();
  };

  const setStatusFor = async (id: string, next: StatusKey) => {
    await fetch("/api/admin/news/review", {
      method: "POST",
      headers,
      body: JSON.stringify({ articleId: id, status: next })
    });
    await loadList();
    await loadReport();
  };

  const applyBatch = async (next: StatusKey) => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length) return;
    await Promise.all(
      ids.map((id) =>
        fetch("/api/admin/news/review", {
          method: "POST",
          headers,
          body: JSON.stringify({ articleId: id, status: next })
        })
      )
    );
    await loadList();
    await loadReport();
  };

  const applySchedule = async () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length || !batchSchedule) return;
    const scheduledAt = toIso(batchSchedule);
    await Promise.all(
      ids.map((id) =>
        fetch("/api/admin/news/review", {
          method: "POST",
          headers,
          body: JSON.stringify({ articleId: id, scheduledAt })
        })
      )
    );
    await loadList();
  };

  const updateSource = async (id: string, updates: Partial<SourceItem>) => {
    await fetch("/api/admin/news/sources", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, updates })
    });
    await loadSources();
  };

  const createSource = async () => {
    if (!sourceForm.name || !sourceForm.url) return;
    await fetch("/api/admin/news/sources", {
      method: "POST",
      headers,
      body: JSON.stringify(sourceForm)
    });
    setSourceForm({
      name: "",
      type: "rss",
      url: "",
      logo_url: "",
      enabled: true,
      content_policy: "excerpt_only"
    });
    await loadSources();
  };

  const t = (zh: string, en: string) => (locale === "zh" ? zh : en);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/85 font-semibold">{t("新闻审核后台", "News Admin")}</div>
        <div className="mt-2 text-sm text-white/60">
          {t(
            "请先输入管理员密钥（NEWS_CRON_SECRET），用于后台审核与源配置。",
            "Enter the admin secret (NEWS_CRON_SECRET) to access review and source settings."
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder={t("管理员密钥", "Admin secret")}
            className="min-w-[240px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          />
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
            onClick={() => {
              try {
                localStorage.setItem(SECRET_KEY, secret);
              } catch {
                // ignore
              }
              loadList();
              loadSources();
              loadReport();
            }}
          >
            {t("连接", "Connect")}
          </button>
        </div>
        {adminError === "unauthorized" ? (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
            {t("密钥无效或未授权。", "Invalid secret or unauthorized.")}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-white/85 font-semibold">{t("审核队列", "Review Queue")}</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(["pending", "published", "rejected"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`rounded-xl border px-3 py-1.5 text-sm ${
                  status === key
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-white/0 text-white/70 hover:bg-white/5"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("搜索标题", "Search title")}
            className="min-w-[240px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
          />
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={loadList}
          >
            {t("刷新", "Refresh")}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
          <button
            type="button"
            className="rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-white/90"
            onClick={() => applyBatch("published")}
          >
            {t("批量发布", "Publish selected")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-3 py-1 text-white/90"
            onClick={() => applyBatch("rejected")}
          >
            {t("批量拒绝", "Reject selected")}
          </button>
          <input
            type="datetime-local"
            value={batchSchedule}
            onChange={(event) => setBatchSchedule(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
          />
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10"
            onClick={applySchedule}
          >
            {t("批量定时", "Schedule selected")}
          </button>
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-white/60">{t("加载中…", "Loading...")}</div>
        ) : null}

        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const edit = edits[item.id] || {};
            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/0 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[item.id])}
                    onChange={() => toggleSelect(item.id)}
                  />
                  <span>{item.news_sources?.name || "Source"}</span>
                  <span>·</span>
                  <span>{item.published_at ? new Date(item.published_at).toLocaleString() : "-"}</span>
                  <span className="ml-auto">
                    {t("浏览", "Views")}: {item.news_metrics?.views || 0} / {t("点击", "Clicks")}:
                    {item.news_metrics?.clicks || 0}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <input
                      value={edit.title_zh ?? item.title_zh ?? ""}
                      onChange={(event) => updateEdit(item.id, { title_zh: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                      placeholder={t("中文标题", "Title (ZH)")}
                    />
                    <textarea
                      value={edit.summary_zh ?? item.summary_zh ?? ""}
                      onChange={(event) => updateEdit(item.id, { summary_zh: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                      rows={2}
                      placeholder={t("中文摘要", "Summary (ZH)")}
                    />
                  </div>
                  <div className="space-y-2">
                    <input
                      value={edit.title_en ?? item.title_en ?? ""}
                      onChange={(event) => updateEdit(item.id, { title_en: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
                      placeholder={t("英文标题", "Title (EN)")}
                    />
                    <textarea
                      value={edit.summary_en ?? item.summary_en ?? ""}
                      onChange={(event) => updateEdit(item.id, { summary_en: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                      rows={2}
                      placeholder={t("英文摘要", "Summary (EN)")}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <select
                    value={edit.category ?? item.category}
                    onChange={(event) => updateEdit(item.id, { category: event.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                  >
                    {["fx", "stocks", "commodities", "crypto", "macro"].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <select
                    value={edit.importance ?? item.importance}
                    onChange={(event) => updateEdit(item.id, { importance: event.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                  >
                    {["high", "medium", "low"].map((imp) => (
                      <option key={imp} value={imp}>
                        {imp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    value={edit.scheduled_at ?? toInputValue(item.scheduled_at) ?? ""}
                    onChange={(event) => updateEdit(item.id, { scheduled_at: event.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white/80 hover:bg-white/10"
                    onClick={() => saveArticle(item.id)}
                  >
                    {t("保存", "Save")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-white/90"
                    onClick={() => setStatusFor(item.id, "published")}
                  >
                    {t("发布", "Publish")}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-3 py-1 text-white/90"
                    onClick={() => setStatusFor(item.id, "rejected")}
                  >
                    {t("拒绝", "Reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/85 font-semibold">{t("统计报表", "Reports")}</div>
        {!report ? (
          <div className="mt-2 text-sm text-white/60">{t("暂无数据", "No data yet")}</div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/0 p-3 text-sm text-white/70">
              <div className="text-white/85 font-semibold">{t("全站汇总", "Totals")}</div>
              <div className="mt-2 space-y-1">
                <div>
                  {t("浏览", "Views")}: {Math.round(report.totals.views)}
                </div>
                <div>
                  {t("点击", "Clicks")}: {Math.round(report.totals.clicks)}
                </div>
                <div>CTR: {(report.totals.ctr * 100).toFixed(1)}%</div>
                <div>
                  {t("平均停留", "Avg dwell")}: {report.totals.avgDwell.toFixed(1)}s
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/0 p-3 text-sm text-white/70">
              <div className="text-white/85 font-semibold">{t("热门文章", "Top Articles")}</div>
              <div className="mt-2 space-y-2">
                {report.topArticles.map((item, idx) => (
                  <div key={`${item.slug || idx}`} className="text-xs text-white/70">
                    <div className="line-clamp-1 text-white/85">{item.title}</div>
                    <div>
                      Views: {item.views} · CTR: {(item.ctr * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/0 p-3 text-sm text-white/70">
              <div className="text-white/85 font-semibold">{t("热门分类", "Top Categories")}</div>
              <div className="mt-2 space-y-2">
                {report.categories.map((item) => (
                  <div key={item.category} className="text-xs text-white/70">
                    <div className="text-white/85">{item.category}</div>
                    <div>
                      Views: {item.views} · CTR: {(item.ctr * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-white/85 font-semibold">{t("新闻源配置", "News Sources")}</div>
        <div className="mt-3 space-y-3">
          {sources.map((src) => (
            <div key={src.id} className="rounded-2xl border border-white/10 bg-white/0 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={Boolean(src.enabled)}
                  onChange={(event) => updateSource(src.id, { enabled: event.target.checked })}
                />
                <span>{src.name}</span>
                <span>·</span>
                <span>{src.type}</span>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <input
                  value={src.url}
                  onChange={(event) =>
                    setSources((prev) =>
                      prev.map((item) =>
                        item.id === src.id ? { ...item, url: event.target.value } : item
                      )
                    )
                  }
                  onBlur={(event) => updateSource(src.id, { url: event.target.value })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                  placeholder="URL"
                />
                <input
                  value={src.logo_url || ""}
                  onChange={(event) =>
                    setSources((prev) =>
                      prev.map((item) =>
                        item.id === src.id ? { ...item, logo_url: event.target.value } : item
                      )
                    )
                  }
                  onBlur={(event) => updateSource(src.id, { logo_url: event.target.value })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                  placeholder="Logo URL"
                />
                <select
                  value={src.content_policy}
                  onChange={(event) => updateSource(src.id, { content_policy: event.target.value })}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  {["full", "excerpt_only", "metadata_only"].map((policy) => (
                    <option key={policy} value={policy}>
                      {policy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/0 p-4">
          <div className="text-white/85 font-semibold">{t("新增新闻源", "Add Source")}</div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input
              value={sourceForm.name || ""}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              placeholder={t("名称", "Name")}
            />
            <select
              value={sourceForm.type || "rss"}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, type: event.target.value }))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
            >
              {["rss", "official", "licensed_api"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              value={sourceForm.url || ""}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, url: event.target.value }))}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              placeholder="URL"
            />
            <select
              value={sourceForm.content_policy || "excerpt_only"}
              onChange={(event) =>
                setSourceForm((prev) => ({ ...prev, content_policy: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
            >
              {["full", "excerpt_only", "metadata_only"].map((policy) => (
                <option key={policy} value={policy}>
                  {policy}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2">
            <input
              value={sourceForm.logo_url || ""}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, logo_url: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              placeholder="Logo URL"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-white/60">
              <input
                type="checkbox"
                checked={Boolean(sourceForm.enabled)}
                onChange={(event) =>
                  setSourceForm((prev) => ({ ...prev, enabled: event.target.checked }))
                }
                className="mr-2"
              />
              {t("启用", "Enabled")}
            </label>
            <button
              type="button"
              className="ml-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
              onClick={createSource}
            >
              {t("添加", "Add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
