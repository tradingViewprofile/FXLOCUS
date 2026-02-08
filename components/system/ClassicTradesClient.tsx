"use client";

import React from "react";
import { UploadCloud } from "lucide-react";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PreviewModal } from "@/components/system/PreviewModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type ClassicTradeItem = {
  id: string;
  reason: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  image_name?: string | null;
};

export function ClassicTradesClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<ClassicTradeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; url: string } | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const formRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/classic-trades/list", { cache: "no-store" });
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

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(items);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!f) return;
    setFile(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0] || null;
    if (!f) return;
    const name = (f.name || "").toLowerCase();
    if (!name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
      setError(locale === "zh" ? "仅支持 PNG/JPG 格式" : "PNG/JPG only");
      return;
    }
    setFile(f);
  };

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const resetForm = () => {
    setReason("");
    setFile(null);
    setEditingId(null);
  };

  const startEdit = (item: ClassicTradeItem) => {
    setEditingId(item.id);
    setReason(item.reason || "");
    setFile(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(locale === "zh" ? "\u8bf7\u586b\u5199\u4e0a\u4f20\u7406\u7531" : "Reason is required.");
      return;
    }
    if (!file) {
      setError(locale === "zh" ? "\u8bf7\u9009\u62e9PNG/JPG\u56fe\u7247" : "Please choose a PNG/JPG image.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("reason", trimmed);
      fd.set("file", file);
      if (editingId) fd.set("entryId", editingId);
      const res = await fetch("/api/system/classic-trades/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "upload_failed");
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "upload_failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    const ok = window.confirm(locale === "zh" ? "\u786e\u8ba4\u5220\u9664\u8be5\u63d0\u4ea4\uff1f" : "Delete this entry?");
    if (!ok) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/classic-trades/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId: id })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "delete_failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "delete_failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "\u7ecf\u5178\u4ea4\u6613" : "Classic Trades"}
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "\u4e0a\u4f20\u7ecf\u5178\u4ea4\u6613\u56fe\u7247\u4e0e\u7406\u7531\uff0c\u53ef\u4fee\u6539\u66ff\u6362\u6216\u5220\u9664\u63d0\u4ea4\u3002"
            : "Upload classic trade images with reasons. You can edit or delete submissions."}
        </div>
      </div>

      <div ref={formRef} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "\u63d0\u4ea4\u7ecf\u5178\u4ea4\u6613" : "Submit a classic trade"}
        </div>
        <div className="space-y-2">
          <label className="text-xs text-white/60">
            {locale === "zh"
              ? "\u4e0a\u4f20\u7406\u7531\uff08\u4e3a\u4f55\u7ecf\u5178\uff1f\u7ed9\u4f60\u4ec0\u4e48\u7075\u611f\uff1f\uff09"
              : "Reason (why is it classic? what did you learn?)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            placeholder={locale === "zh" ? "\u8bf7\u8f93\u5165\u539f\u56e0..." : "Write your reason..."}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/60">
            {locale === "zh" ? "\u4e0a\u4f20\u56fe\u7247\uff08PNG/JPG\uff09" : "Image (PNG/JPG)"}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            data-drag={dragActive ? "1" : "0"}
            className="system-upload-card h-[150px] w-full"
          >
            {previewUrl ? (
              <img src={previewUrl} alt={file?.name || "preview"} />
            ) : (
              <div className="system-upload-placeholder">
                <div className="system-upload-plus">+</div>
                <div>{locale === "zh" ? "\u70b9\u51fb\u4e0a\u4f20\u56fe\u7247" : "Upload image"}</div>
              </div>
            )}
          </button>
          <div className="system-upload-hint">
            {locale === "zh" ? "\u5efa\u8bae\u5c3a\u5bf8 16:9\uff0cjpg/png \u683c\u5f0f" : "Suggested 16:9, jpg/png format"}
          </div>
          {file ? <div className="text-xs text-white/50">{file.name}</div> : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" />
            {uploading
              ? locale === "zh"
                ? "\u4e0a\u4f20\u4e2d..."
                : "Uploading..."
              : editingId
                ? locale === "zh"
                  ? "\u4fee\u6539\u63d0\u4ea4"
                  : "Replace submission"
                : locale === "zh"
                  ? "\u4e0a\u4f20"
                  : "Upload"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={uploading}
              onClick={resetForm}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              {locale === "zh" ? "\u53d6\u6d88\u4fee\u6539" : "Cancel edit"}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "\u52a0\u8f7d\u4e2d..." : "Loading..."}
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "\u6682\u65e0\u63d0\u4ea4" : "No submissions."}
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((it) => {
          const status = it.reviewed_at ? (locale === "zh" ? "\u5df2\u9605" : "Reviewed") : locale === "zh" ? "\u5f85\u5ba1\u6838" : "Pending";
          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/80 text-sm">{status}</div>
                <div className="ml-auto text-xs text-white/50">
                  <ClientDateTime value={it.created_at} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                <button
                  type="button"
                  disabled={!it.image_url}
                  onClick={() =>
                    it.image_url && setPreview({ name: it.image_name || "Preview", url: it.image_url })
                  }
                  className="group relative h-[120px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.image_name || "preview"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                      {locale === "zh" ? "\u65e0\u9884\u89c8" : "No preview"}
                    </div>
                  )}
                </button>
                <div className="space-y-2">
                  <div className="text-sm text-white/85 whitespace-pre-wrap">{it.reason}</div>
                  {it.review_note ? (
                    <div className="text-xs text-white/60">
                      {locale === "zh" ? "\u5ba1\u6279\u5185\u5bb9" : "Review note"}: {it.review_note}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => startEdit(it)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50"
                    >
                      {locale === "zh" ? "\u4fee\u6539" : "Edit"}
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => remove(it.id)}
                      className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {locale === "zh" ? "\u5220\u9664" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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

      <PreviewModal
        file={preview ? { name: preview.name, url: preview.url, mimeType: "image" } : null}
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
