"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import { UploadCloud } from "lucide-react";

import { ClientDateTime } from "@/components/system/ClientDateTime";
import { PreviewModal } from "@/components/system/PreviewModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type WeeklySummaryItem = {
  id: string;
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
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const DOC_EXTENSIONS = new Set(["doc", "docx", "pdf", "txt"]);
const DOC_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain"
]);

function isAllowedFile(file: File, mode: "image" | "doc") {
  const name = String(file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() || "" : "";
  const mime = String(file.type || "").toLowerCase();
  if (mode === "doc") {
    return DOC_EXTENSIONS.has(ext) || DOC_MIME_TYPES.has(mime);
  }
  return IMAGE_EXTENSIONS.has(ext) || IMAGE_MIME_TYPES.has(mime);
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function WeeklySummariesClient({ locale }: { locale: "zh" | "en" }) {
  const [items, setItems] = React.useState<WeeklySummaryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [studentName, setStudentName] = React.useState("");
  const [summaryText, setSummaryText] = React.useState("");
  const [strategyFile, setStrategyFile] = React.useState<File | null>(null);
  const [curveFile, setCurveFile] = React.useState<File | null>(null);
  const [statsFile, setStatsFile] = React.useState<File | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<WeeklySummaryItem | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; url: string; mimeType?: string | null } | null>(
    null
  );
  const [dragTarget, setDragTarget] = React.useState<"strategy" | "curve" | "stats" | null>(null);
  const [role, setRole] = React.useState<string>("student");
  const formRef = React.useRef<HTMLDivElement | null>(null);
  const strategyRef = React.useRef<HTMLInputElement | null>(null);
  const curveRef = React.useRef<HTMLInputElement | null>(null);
  const statsRef = React.useRef<HTMLInputElement | null>(null);
  const strategyPreview = useObjectUrl(strategyFile);
  const curvePreview = useObjectUrl(curveFile);
  const statsPreview = useObjectUrl(statsFile);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/weekly-summaries/list", { cache: "no-store" });
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

  const orderedItems = React.useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return list;
  }, [items]);

  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } = usePagination(orderedItems);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/system/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && json?.ok) {
          setRole(String(json.user?.role || "student"));
          if (!studentName) {
            const fallback = String(json.user?.full_name || "").trim();
            if (fallback) setStudentName(fallback);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentName]);

  const resetForm = () => {
    setSummaryText("");
    setEditingId(null);
    setEditingEntry(null);
    setStrategyFile(null);
    setCurveFile(null);
    setStatsFile(null);
  };

  const startEdit = (item: WeeklySummaryItem) => {
    setEditingId(item.id);
    setEditingEntry(item);
    setStudentName(item.student_name || studentName);
    setSummaryText(item.summary_text || "");
    setStrategyFile(null);
    setCurveFile(null);
    setStatsFile(null);
    if (strategyRef.current) strategyRef.current.value = "";
    if (curveRef.current) curveRef.current.value = "";
    if (statsRef.current) statsRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onFileChange = (setter: (f: File | null) => void, ref: React.RefObject<HTMLInputElement>) => {
    const f = ref.current?.files?.[0] || null;
    if (ref.current) ref.current.value = "";
    if (!f) return;
    const mode = role === "assistant" ? "doc" : "image";
    if (!isAllowedFile(f, mode)) {
      setError(
        locale === "zh"
          ? mode === "doc"
            ? "请上传 doc/docx/pdf/txt 格式文件。"
            : "请上传 PNG/JPG 图片。"
          : mode === "doc"
            ? "Please upload doc/docx/pdf/txt files."
            : "Please upload a PNG/JPG image."
      );
      return;
    }
    setter(f);
  };

  const onDragOver =
    (key: "strategy" | "curve" | "stats") => (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (dragTarget !== key) setDragTarget(key);
    };

  const onDragLeave = (key: "strategy" | "curve" | "stats") => () => {
    if (dragTarget === key) setDragTarget(null);
  };

  const onDropFile =
    (
      key: "strategy" | "curve" | "stats",
      setter: (f: File | null) => void,
      ref: React.RefObject<HTMLInputElement>
    ) =>
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDragTarget(null);
      const f = e.dataTransfer.files?.[0] || null;
      if (ref.current) ref.current.value = "";
      if (!f) return;
      const mode = role === "assistant" ? "doc" : "image";
      if (!isAllowedFile(f, mode)) {
        setError(
          locale === "zh"
            ? mode === "doc"
              ? "请上传 doc/docx/pdf/txt 文件。"
              : "请上传 PNG/JPG 图片。"
            : mode === "doc"
              ? "Please upload doc/docx/pdf/txt files."
              : "Please upload a PNG/JPG image."
        );
        return;
      }
      setter(f);
    };

  const submit = async () => {
    const trimmedName = studentName.trim();
    if (!trimmedName) {
      setError(locale === "zh" ? "请填写姓名。" : "Name is required.");
      return;
    }
    const trimmedSummary = summaryText.trim();
    if (!trimmedSummary) {
      setError(locale === "zh" ? "请填写总结。" : "Summary is required.");
      return;
    }
    if (!editingId && (!strategyFile || !curveFile || !statsFile)) {
      setError(
        locale === "zh"
          ? isAssistant
            ? "请上传三个数据文件。"
            : "请上传三张图片。"
          : isAssistant
            ? "Please upload all three files."
            : "Please upload all three images."
      );
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const pendingFiles: Array<{ key: "strategy" | "curve" | "stats"; file: File }> = [];
      if (strategyFile) pendingFiles.push({ key: "strategy", file: strategyFile });
      if (curveFile) pendingFiles.push({ key: "curve", file: curveFile });
      if (statsFile) pendingFiles.push({ key: "stats", file: statsFile });

      let entryId = editingId || "";
      let uploadInfos: Array<any> = [];

      if (pendingFiles.length) {
        const presignRes = await fetch("/api/system/weekly-summaries/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entryId: editingId || undefined,
            files: pendingFiles.map((item) => ({
              key: item.key,
              name: item.file.name || "",
              size: item.file.size,
              type: item.file.type || ""
            }))
          })
        });
        const presignJson = await presignRes.json().catch(() => null);
        if (!presignRes.ok || !presignJson?.ok) {
          throw new Error(presignJson?.error || "presign_failed");
        }
        entryId = String(presignJson.entryId || "");
        uploadInfos = Array.isArray(presignJson.uploads) ? presignJson.uploads : [];
        if (!entryId || uploadInfos.length !== pendingFiles.length) {
          throw new Error("presign_failed");
        }

        const uploadsByKey = new Map(uploadInfos.map((item: any) => [item.key, item]));

        for (const item of pendingFiles) {
          const upload = uploadsByKey.get(item.key);
          if (!upload) throw new Error("presign_failed");
          const uploadUrl = String(upload.uploadUrl || "");
          if (uploadUrl) {
            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": item.file.type || "application/octet-stream" },
              body: item.file
            });
            if (!putRes.ok) throw new Error("upload_failed");
          } else {
            throw new Error("SIGNED_URL_FAILED");
          }
        }
      }

      if (!entryId) throw new Error("INVALID_ENTRY");

      const finalizeRes = await fetch("/api/system/weekly-summaries/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId,
          summaryText: trimmedSummary,
          files: uploadInfos.map((upload: any) => {
            const source = pendingFiles.find((item) => item.key === upload.key);
            return {
              key: upload.key,
              bucket: upload.bucket,
              path: upload.path,
              fileName: upload.fileName || source?.file.name || "",
              size: source?.file.size || 0,
              mimeType: source?.file.type || null
            };
          })
        })
      });
      const finalizeJson = await finalizeRes.json().catch(() => null);
      if (!finalizeRes.ok || !finalizeJson?.ok) {
        throw new Error(finalizeJson?.error || "upload_failed");
      }

      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "upload_failed");
    } finally {
      setUploading(false);
    }
  };

  const isAssistant = role === "assistant";
  const title = locale === "zh" ? "周总结" : "Weekly Summary";
  const nameLabel = role === "leader"
    ? (locale === "zh" ? "姓名" : "Name")
    : locale === "zh"
      ? "学员名称"
      : "Student name";
  const strategyDisplay = isAssistant ? null : strategyPreview || editingEntry?.strategy_url || null;
  const curveDisplay = isAssistant ? null : curvePreview || editingEntry?.curve_url || null;
  const statsDisplay = isAssistant ? null : statsPreview || editingEntry?.stats_url || null;
  const fileAccept = isAssistant
    ? ".doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
    : "image/png,image/jpeg";
  const uploadHint =
    locale === "zh"
      ? isAssistant
        ? "支持 doc/docx/pdf/txt 格式"
        : "建议尺寸 16:9，jpg/png 格式"
      : isAssistant
        ? "Supported: doc/docx/pdf/txt"
        : "Suggested 16:9, jpg/png format";
  const uploadPlaceholder =
    locale === "zh" ? (isAssistant ? "点击上传文件" : "点击上传图片") : isAssistant ? "Upload file" : "Upload image";
  const assistantLabels = [
    { zh: "招聘数据", en: "Recruiting data" },
    { zh: "学员数据", en: "Student data" },
    { zh: "云电脑数据", en: "Cloud PC data" }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{title}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? isAssistant
              ? "提交每周总结，上传本周招聘数据、学员数据与云电脑数据文件。仅支持 doc/docx/pdf/txt 格式。"
              : "提交每周总结，包含策略、曲线与统计图片。仅支持 PNG/JPG 格式。"
            : isAssistant
              ? "Submit weekly recruiting, student, and cloud PC data files (doc/docx/pdf/txt)."
              : "Submit a weekly summary with strategy, curve, and stats images (PNG/JPG only)."}
        </div>
      </div>

      <div ref={formRef} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="text-white/85 font-semibold">
          {editingId ? (locale === "zh" ? "修改周总结" : "Edit weekly summary") : locale === "zh" ? "上传周总结" : "Upload weekly summary"}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-white/60">{nameLabel}</label>
            <input
              value={studentName}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 cursor-not-allowed select-none"
              placeholder={locale === "zh" ? "请输入姓名" : "Enter name"}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60">{locale === "zh" ? "上传时间" : "Upload time"}</label>
            <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
              {editingEntry?.created_at ? <ClientDateTime value={editingEntry.created_at} /> : "-"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs text-white/60">
              {isAssistant
                ? locale === "zh"
                  ? assistantLabels[0].zh
                  : assistantLabels[0].en
                : locale === "zh"
                  ? "策略（PNG/JPG）"
                  : "Strategy (PNG/JPG)"}
            </label>
            <input
              ref={strategyRef}
              type="file"
              accept={fileAccept}
              onChange={() => onFileChange(setStrategyFile, strategyRef)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => strategyRef.current?.click()}
              onDragOver={onDragOver("strategy")}
              onDragLeave={onDragLeave("strategy")}
              onDrop={onDropFile("strategy", setStrategyFile, strategyRef)}
              data-drag={dragTarget === "strategy" ? "1" : "0"}
              className="system-upload-card h-[140px] w-full"
            >
              {strategyDisplay ? (
                <img src={strategyDisplay} alt={strategyFile?.name || editingEntry?.strategy_name || "strategy"} />
              ) : (
                <div className="system-upload-placeholder">
                  <div className="system-upload-plus">+</div>
                  <div>{uploadPlaceholder}</div>
                </div>
              )}
            </button>
            <div className="system-upload-hint">{uploadHint}</div>
            {strategyFile ? (
              <div className="text-xs text-white/50">{strategyFile.name}</div>
            ) : editingEntry?.strategy_name ? (
              <div className="text-xs text-white/50">
                {locale === "zh" ? "已上传：" : "Current: "}
                {editingEntry.strategy_name}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60">
              {isAssistant
                ? locale === "zh"
                  ? assistantLabels[1].zh
                  : assistantLabels[1].en
                : locale === "zh"
                  ? "曲线（PNG/JPG）"
                  : "Weekly curve (PNG/JPG)"}
            </label>
            <input
              ref={curveRef}
              type="file"
              accept={fileAccept}
              onChange={() => onFileChange(setCurveFile, curveRef)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => curveRef.current?.click()}
              onDragOver={onDragOver("curve")}
              onDragLeave={onDragLeave("curve")}
              onDrop={onDropFile("curve", setCurveFile, curveRef)}
              data-drag={dragTarget === "curve" ? "1" : "0"}
              className="system-upload-card h-[140px] w-full"
            >
              {curveDisplay ? (
                <img src={curveDisplay} alt={curveFile?.name || editingEntry?.curve_name || "curve"} />
              ) : (
                <div className="system-upload-placeholder">
                  <div className="system-upload-plus">+</div>
                  <div>{uploadPlaceholder}</div>
                </div>
              )}
            </button>
            <div className="system-upload-hint">{uploadHint}</div>
            {curveFile ? (
              <div className="text-xs text-white/50">{curveFile.name}</div>
            ) : editingEntry?.curve_name ? (
              <div className="text-xs text-white/50">
                {locale === "zh" ? "已上传：" : "Current: "}
                {editingEntry.curve_name}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60">
              {isAssistant
                ? locale === "zh"
                  ? assistantLabels[2].zh
                  : assistantLabels[2].en
                : locale === "zh"
                  ? "统计（PNG/JPG）"
                  : "Stats (PNG/JPG)"}
            </label>
            <input
              ref={statsRef}
              type="file"
              accept={fileAccept}
              onChange={() => onFileChange(setStatsFile, statsRef)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => statsRef.current?.click()}
              onDragOver={onDragOver("stats")}
              onDragLeave={onDragLeave("stats")}
              onDrop={onDropFile("stats", setStatsFile, statsRef)}
              data-drag={dragTarget === "stats" ? "1" : "0"}
              className="system-upload-card h-[140px] w-full"
            >
              {statsDisplay ? (
                <img src={statsDisplay} alt={statsFile?.name || editingEntry?.stats_name || "stats"} />
              ) : (
                <div className="system-upload-placeholder">
                  <div className="system-upload-plus">+</div>
                  <div>{uploadPlaceholder}</div>
                </div>
              )}
            </button>
            <div className="system-upload-hint">{uploadHint}</div>
            {statsFile ? (
              <div className="text-xs text-white/50">{statsFile.name}</div>
            ) : editingEntry?.stats_name ? (
              <div className="text-xs text-white/50">
                {locale === "zh" ? "已上传：" : "Current: "}
                {editingEntry.stats_name}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-white/60">{locale === "zh" ? "总结（文本）" : "Summary"}</label>
          <textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            className="w-full min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85"
            placeholder={locale === "zh" ? "请输入总结..." : "Write your summary..."}
          />
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
                ? "提交中..."
                : "Submitting..."
              : editingId
                ? locale === "zh"
                  ? "修改提交"
                  : "Update"
                : locale === "zh"
                  ? "提交"
                  : "Submit"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={uploading}
              onClick={resetForm}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-50"
            >
              {locale === "zh" ? "取消修改" : "Cancel edit"}
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中..." : "Loading..."}
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "暂无记录" : "No submissions yet."}
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((it) => {
          const reviewed = Boolean(it.reviewed_at);
          const status = reviewed ? (locale === "zh" ? "已阅" : "Reviewed") : locale === "zh" ? "待阅" : "Pending";
          const statusClass = reviewed ? "text-emerald-300" : "text-amber-200";
          return (
            <div key={it.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold">{it.student_name || "-"}</div>
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
                <div className="text-sm text-white/85 whitespace-pre-wrap">{it.summary_text}</div>
                {it.review_note ? (
                  <div className="text-xs text-white/60">
                    {locale === "zh" ? "审核备注" : "Review note"}: {it.review_note}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => startEdit(it)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 disabled:opacity-50"
                >
                  {locale === "zh" ? "编辑" : "Edit"}
                </button>
                <span className="text-xs text-white/40">
                  {locale === "zh" ? "不可删除，仅支持修改" : "No delete; edits only."}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && orderedItems.length ? (
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
        file={preview ? { name: preview.name, url: preview.url, mimeType: preview.mimeType || undefined } : null}
        locale={locale}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}





