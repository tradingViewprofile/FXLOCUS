"use client";

import React from "react";

import { AdminFilesClient } from "@/components/system/admin/AdminFilesClient";
import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PreviewModal } from "@/components/system/PreviewModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";
import { saveWithPicker } from "@/lib/downloads/saveWithPicker";
import { isSuperAdmin, type SystemRole } from "@/lib/system/roles";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";

type MeResponse =
  | { ok: true; user: { role: SystemRole } }
  | { ok: false; error: string };

type FileItem = {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  size_bytes: number;
  mime_type?: string | null;
  created_at: string;
  can_download: boolean;
  request_status: "none" | "requested" | "approved" | "rejected";
  rejection_reason?: string | null;
};

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/json": "json",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4"
};

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function buildDownloadName(file: FileItem) {
  const baseName = sanitizeFilename(file.name || "download");
  const hasExt = /\.[a-z0-9]{1,6}$/i.test(baseName);
  if (hasExt) return baseName;
  const ext = file.mime_type ? EXT_BY_MIME[file.mime_type] : "";
  return ext ? `${baseName}.${ext}` : baseName;
}

export function FilesClient({ locale }: { locale: "zh" | "en" }) {
  const [role, setRole] = React.useState<SystemRole | null>(null);
  const [items, setItems] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; url: string; mimeType?: string | null } | null>(null);
  const displayItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return bt - at;
    });
  }, [items]);
  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } =
    usePagination(displayItems);

  const loadFiles = React.useCallback(async () => {
    const res = await fetch("/api/system/files/list", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(json?.error || "load_failed");
    setItems(Array.isArray(json.files) ? json.files : []);
  }, []);

  const refresh = React.useCallback(() => {
    if (!role || isSuperAdmin(role)) return;
    loadFiles().catch(() => null);
  }, [loadFiles, role]);

  useSystemRealtimeRefresh(refresh);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/system/me", { cache: "no-store" });
        const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;
        if (!alive) return;
        if (!meRes.ok || !meJson?.ok) throw new Error((meJson as any)?.error || "load_failed");

        const nextRole = meJson.user.role;
        setRole(nextRole);

        if (isSuperAdmin(nextRole)) {
          setLoading(false);
          return;
        }

        await loadFiles();
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "load_failed");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [loadFiles]);

  const download = async (file: FileItem) => {
    const ok = window.confirm(locale === "zh" ? "确认下载该文件？" : "Download this file?");
    if (!ok) return;
    const res = await fetch("/api/system/files/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileId: file.id })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok || !json?.url) return;
    await saveWithPicker({
      url: json.url,
      filename: buildDownloadName(file),
      mimeType: file.mime_type || undefined
    });
  };

  const openPreview = async (item: FileItem) => {
    if (!item?.id) return;
    setPreviewingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/system/files/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: item.id })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.error || "preview_failed");
      setPreview({ name: item.name, url: json.url, mimeType: item.mime_type });
    } catch (e: any) {
      setError(e?.message || "preview_failed");
    } finally {
      setPreviewingId(null);
    }
  };

  const requestAccess = async (fileId: string) => {
    const ok = window.confirm(locale === "zh" ? "确认申请该文件权限？" : "Request access to this file?");
    if (!ok) return;
    const res = await fetch("/api/system/files/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileId })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return;
    await loadFiles();
  };

  if (role && isSuperAdmin(role)) return <AdminFilesClient locale={locale} />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "文件" : "Files"}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "可查看全部资料，未授权的文件可提交申请；通过后可下载。"
            : "Browse files. Request access for locked items, and download after approval."}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中…" : "Loading…"}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
          {locale === "zh" ? "加载失败：" : "Failed: "} {error}
        </div>
      ) : null}

      {!loading && !displayItems.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "暂无文件" : "No files."}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageItems.map((f) => (
          <div key={f.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs text-white/50">{f.category}</div>
            <div className="mt-2 text-white/90 font-semibold">{f.name}</div>
            {f.description ? <div className="mt-2 text-sm text-white/65 leading-6">{f.description}</div> : null}

            {!f.can_download ? (
              <div className="mt-3 text-xs text-white/55">
                {f.request_status === "requested"
                  ? locale === "zh"
                    ? "已申请，等待审批"
                    : "Requested (pending)"
                  : f.request_status === "rejected"
                    ? locale === "zh"
                      ? `已拒绝：${f.rejection_reason || "-"}`
                      : `Rejected: ${f.rejection_reason || "-"}`
                    : locale === "zh"
                      ? "未授权，可申请权限"
                      : "Locked. You can request access."}
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              {f.can_download ? (
                <>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => openPreview(f)}
                    disabled={previewingId === f.id}
                  >
                    {locale === "zh" ? "预览" : "Preview"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                    onClick={() => download(f)}
                  >
                    {locale === "zh" ? "下载" : "Download"}
                  </button>
                </>
              ) : f.request_status === "requested" ? (
                <span className="text-xs text-white/50">{locale === "zh" ? "等待审批…" : "Pending…"}</span>
              ) : (
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                  onClick={() => requestAccess(f.id)}
                >
                  {locale === "zh" ? "申请权限" : "Request access"}
                </button>
              )}

              <div className="ml-auto text-xs text-white/45">
                <ClientDateTime value={f.created_at} format="date" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {!loading && displayItems.length ? (
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

      <PreviewModal
        file={preview ? { name: preview.name, url: preview.url, mimeType: preview.mimeType } : null}
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

