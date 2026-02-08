"use client";

import React from "react";
import { FileText, FileVideo, UploadCloud } from "lucide-react";

import { ClientDateTime } from "@/components/system/ClientDateTime";

function ContentIcon({ mimeType }: { mimeType: string | null | undefined }) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("video/") || mime.includes("mp4")) return <FileVideo className="h-4 w-4 text-white/70" />;
  if (mime.includes("pdf") || mime.includes("msword") || mime.includes("officedocument")) {
    return <FileText className="h-4 w-4 text-white/70" />;
  }
  return <FileText className="h-4 w-4 text-white/70" />;
}

type CourseRow = {
  id: number;
  title_zh?: string | null;
  title_en?: string | null;
  summary_zh?: string | null;
  summary_en?: string | null;
  published?: boolean | null;
  deleted_at?: string | null;
  content_bucket?: string | null;
  content_path?: string | null;
  content_file_name?: string | null;
  content_mime_type?: string | null;
  video_variants?: any[] | null;
};

const BASE_COURSE_ID = 20;
const MAX_CONTENT_BYTES = 1024 * 1024 * 1024;

export function AdminCourseContentClient({
  locale,
  initialCourses
}: {
  locale: "zh" | "en";
  initialCourses: CourseRow[];
}) {
  const buildPlaceholderCourse = React.useCallback(
    (id: number): CourseRow => ({
      id,
      title_zh: `第${id}课`,
      title_en: `Lesson ${id}`,
      summary_zh: "课程内容准备中。",
      summary_en: "Content coming soon.",
      published: false
    }),
    []
  );
  const normalizeCourses = React.useCallback(
    (items: CourseRow[]) => {
      const map = new Map<number, CourseRow>();
      (items || []).forEach((course) => {
        if (!course) return;
        const id = Number(course.id);
        if (!Number.isFinite(id) || id < 1) return;
        map.set(id, { ...buildPlaceholderCourse(id), ...course, id });
      });
      const baseCourses = Array.from({ length: BASE_COURSE_ID }, (_, idx) => {
        const id = idx + 1;
        return { ...buildPlaceholderCourse(id), ...(map.get(id) || {}) };
      });
      const extraCourses = Array.from(map.values())
        .filter((course) => course.id > BASE_COURSE_ID)
        .sort((a, b) => a.id - b.id);
      return [...baseCourses, ...extraCourses];
    },
    [buildPlaceholderCourse]
  );

  const [courses, setCourses] = React.useState<CourseRow[]>(() => normalizeCourses(initialCourses));
  const [busy, setBusy] = React.useState<Record<number, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [metaSaved, setMetaSaved] = React.useState<Record<number, boolean>>({});
  const [metaNotice, setMetaNotice] = React.useState<Record<number, { type: "success" | "error"; message: string }>>({});
  const [fileById, setFileById] = React.useState<Record<number, File | null>>({});
  const inputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});
  const [visibleMaxId, setVisibleMaxId] = React.useState(() => {
    const maxId = Math.max(BASE_COURSE_ID, ...(initialCourses || []).map((c) => Number(c.id || 0)));
    return Number.isFinite(maxId) ? maxId : BASE_COURSE_ID;
  });
  React.useEffect(() => {
    const nextCourses = normalizeCourses(initialCourses);
    setCourses(nextCourses);
    setMetaSaved({});
    setMetaNotice({});
    const maxId = Math.max(BASE_COURSE_ID, ...nextCourses.map((c) => c.id));
    setVisibleMaxId(Number.isFinite(maxId) ? maxId : BASE_COURSE_ID);
  }, [initialCourses, normalizeCourses]);

  const updateLocal = (course: CourseRow) => {
    setCourses((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      map.set(course.id, { ...map.get(course.id), ...course });
      return Array.from(map.values()).sort((a, b) => a.id - b.id);
    });
  };

  const ensureCourse = React.useCallback(
    (courseId: number) => {
      setCourses((prev) => {
        if (prev.some((c) => c.id === courseId)) return prev;
        return [...prev, buildPlaceholderCourse(courseId)].sort((a, b) => a.id - b.id);
      });
    },
    [buildPlaceholderCourse]
  );

  const markDirty = React.useCallback((courseId: number) => {
    setMetaSaved((prev) => ({ ...prev, [courseId]: false }));
    setMetaNotice((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
  }, []);

  const saveMeta = async (course: CourseRow) => {
    setBusy((p) => ({ ...p, [course.id]: true }));
    setError(null);
    try {
      const res = await fetch("/api/system/admin/courses/update-meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          title_zh: course.title_zh ?? "",
          title_en: course.title_en ?? "",
          summary_zh: course.summary_zh ?? "",
          summary_en: course.summary_en ?? "",
          published: Boolean(course.published)
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "save_failed");
      if (json.course) updateLocal(json.course);
      setMetaSaved((prev) => ({ ...prev, [course.id]: true }));
      setMetaNotice((prev) => ({
        ...prev,
        [course.id]: {
          type: "success",
          message: locale === "zh" ? "保存成功" : "Saved"
        }
      }));
    } catch (e: any) {
      setError(e?.message || "save_failed");
      setMetaSaved((prev) => ({ ...prev, [course.id]: false }));
      setMetaNotice((prev) => ({
        ...prev,
        [course.id]: {
          type: "error",
          message: locale === "zh" ? "保存失败" : "Save failed"
        }
      }));
    } finally {
      setBusy((p) => ({ ...p, [course.id]: false }));
    }
  };

  const upload = async (course: CourseRow) => {
    const file = fileById[course.id] || null;
    if (!file) return;
    if (file.size > MAX_CONTENT_BYTES) {
      setError(locale === "zh" ? "文件大小不能超过 1GB" : "File must be <= 1GB");
      return;
    }
    setBusy((p) => ({ ...p, [course.id]: true }));
    setError(null);
    try {
      const fd = new FormData();
      fd.set("courseId", String(course.id));
      fd.set("file", file);
      fd.set("title_zh", course.title_zh ?? "");
      fd.set("title_en", course.title_en ?? "");
      fd.set("summary_zh", course.summary_zh ?? "");
      fd.set("summary_en", course.summary_en ?? "");
      fd.set("published", String(Boolean(course.published)));
      const res = await fetch("/api/system/admin/courses/upload-content", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "upload_failed");
      if (json.course) updateLocal(json.course);
      setFileById((p) => ({ ...p, [course.id]: null }));
    } catch (e: any) {
      setError(e?.message || "upload_failed");
    } finally {
      setBusy((p) => ({ ...p, [course.id]: false }));
    }
  };

  const toggleDeleted = async (course: CourseRow, deleted: boolean) => {
    setBusy((p) => ({ ...p, [course.id]: true }));
    setError(null);
    try {
      const res = await fetch("/api/system/admin/courses/update-meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId: course.id, deleted })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
      if (json.course) updateLocal(json.course);
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setBusy((p) => ({ ...p, [course.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">
          {locale === "zh" ? "课程内容管理" : "Course content"}
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "上传课程内容文件，并设置标题/上下架/软删除。"
            : "Upload course content files and manage title/publish/delete."}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {courses.filter((course) => course.id <= visibleMaxId).map((c) => {
          const isBusy = Boolean(busy[c.id]);
          const deleted = Boolean(c.deleted_at);
          const hasContent = Boolean(c.content_path) || Boolean(c.video_variants?.length);
          const saved = Boolean(metaSaved[c.id]);
          const notice = metaNotice[c.id];
          return (
            <div key={c.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-white/90 font-semibold">
                  {locale === "zh" ? `第${c.id}课` : `Lesson ${c.id}`}
                </div>
                {deleted ? (
                  <span className="text-xs rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-rose-100">
                    {locale === "zh" ? "已删除" : "Deleted"}
                  </span>
                ) : null}
                <label className="ml-auto flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={Boolean(c.published) && !deleted}
                    disabled={deleted}
                    onChange={(e) =>
                      setCourses((prev) => {
                        markDirty(c.id);
                        return prev.map((x) =>
                          x.id === c.id ? { ...x, published: e.target.checked } : x
                        );
                      })
                    }
                  />
                  {locale === "zh" ? "已发布" : "Published"}
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={c.title_zh || ""}
                  onChange={(e) =>
                    setCourses((prev) => {
                      markDirty(c.id);
                      return prev.map((x) =>
                        x.id === c.id ? { ...x, title_zh: e.target.value } : x
                      );
                    })
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  placeholder={locale === "zh" ? "中文标题" : "Title (ZH)"}
                />
                <input
                  value={c.title_en || ""}
                  onChange={(e) =>
                    setCourses((prev) => {
                      markDirty(c.id);
                      return prev.map((x) =>
                        x.id === c.id ? { ...x, title_en: e.target.value } : x
                      );
                    })
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  placeholder={locale === "zh" ? "英文标题" : "Title (EN)"}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  value={c.summary_zh || ""}
                  onChange={(e) =>
                    setCourses((prev) => {
                      markDirty(c.id);
                      return prev.map((x) =>
                        x.id === c.id ? { ...x, summary_zh: e.target.value } : x
                      );
                    })
                  }
                  className="min-h-[88px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  placeholder={locale === "zh" ? "中文描述" : "Summary (ZH)"}
                />
                <textarea
                  value={c.summary_en || ""}
                  onChange={(e) =>
                    setCourses((prev) => {
                      markDirty(c.id);
                      return prev.map((x) =>
                        x.id === c.id ? { ...x, summary_en: e.target.value } : x
                      );
                    })
                  }
                  className="min-h-[88px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/85 text-sm"
                  placeholder={locale === "zh" ? "英文描述" : "Summary (EN)"}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">{locale === "zh" ? "内容" : "Content"}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/80 min-w-0">
                    {c.content_path ? <ContentIcon mimeType={c.content_mime_type} /> : <UploadCloud className="h-4 w-4 text-white/70" />}
                    <span className="min-w-0 truncate">
                      {c.content_file_name || c.content_path || (locale === "zh" ? "未上传" : "Not uploaded")}
                    </span>
                  </div>
                  {c.content_path ? (
                    <div className="mt-2 text-xs text-white/45 break-all">
                      {c.content_bucket}/{c.content_path}
                    </div>
                  ) : null}
                </div>
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-xs text-white/50">{locale === "zh" ? "上传/替换内容" : "Upload/replace"}</div>
                  <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    disabled={isBusy}
                    onChange={(e) => {
                      const next = e.target.files?.[0] || null;
                      if (!next) {
                        setFileById((p) => ({ ...p, [c.id]: null }));
                        return;
                      }
                      if (next.size > MAX_CONTENT_BYTES) {
                        setError(locale === "zh" ? "文件大小不能超过 1GB" : "File must be <= 1GB");
                        e.currentTarget.value = "";
                        return;
                      }
                      setFileById((p) => ({ ...p, [c.id]: next }));
                    }}
                    ref={(el) => {
                      inputRefs.current[c.id] = el;
                    }}
                    className="hidden"
                      accept=".pdf,.doc,.docx,.mp4,application/pdf,video/mp4,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        data-disabled={isBusy ? "1" : "0"}
                        onClick={() => inputRefs.current[c.id]?.click()}
                        className="system-upload-card h-[140px] w-full sm:w-[260px]"
                        title={locale === "zh" ? "仅允许 doc/docx/pdf/mp4，单文件 <= 1GB" : "doc/docx/pdf/mp4, <= 1GB"}
                      >
                        {fileById[c.id] ? (
                          <div className="system-upload-placeholder">
                            <ContentIcon mimeType={fileById[c.id]?.type} />
                            <div className="text-sm text-white/80">{fileById[c.id]?.name}</div>
                          </div>
                        ) : (
                          <div className="system-upload-placeholder">
                            <div className="system-upload-plus">+</div>
                            <div>{locale === "zh" ? "点击上传文件" : "Upload file"}</div>
                          </div>
                        )}
                      </button>
                      <div className="system-upload-hint">
                        {locale === "zh" ? "支持 doc/docx/pdf/mp4，单文件 <= 1GB" : "doc/docx/pdf/mp4, <= 1GB"}
                      </div>
                    </div>
                      <button
                        type="button"
                        disabled={isBusy || !fileById[c.id]}
                        onClick={() => upload(c)}
                        className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
                      >
                      {hasContent ? (locale === "zh" ? "替换" : "Replace") : locale === "zh" ? "上传" : "Upload"}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || saved}
                        onClick={() => saveMeta(c)}
                        className="ml-auto px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                      >
                        {locale === "zh" ? "保存设置" : "Save"}
                      </button>
                  </div>
                  {notice ? (
                    <div
                      className={[
                        "text-xs",
                        notice.type === "success" ? "text-emerald-200/80" : "text-rose-200/80"
                      ].join(" ")}
                    >
                      {notice.message}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {deleted ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleDeleted(c, false)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
                      >
                        {locale === "zh" ? "恢复" : "Restore"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => toggleDeleted(c, true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        {locale === "zh" ? "软删除" : "Soft delete"}
                      </button>
                    )}
                    <div className="ml-auto text-xs text-white/45">
                      {c.deleted_at ? (
                        <span>
                          {locale === "zh" ? "删除时间" : "Deleted at"}: <ClientDateTime value={c.deleted_at} />
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            const nextId = visibleMaxId + 1;
            ensureCourse(nextId);
            setVisibleMaxId(nextId);
          }}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
        >
          {locale === "zh" ? `扩展课程（第${visibleMaxId + 1}课）` : `Add Lesson ${visibleMaxId + 1}`}
        </button>
      </div>
    </div>
  );
}

