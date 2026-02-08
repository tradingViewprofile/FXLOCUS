"use client";

import React from "react";
import { useRouter } from "next/navigation";

type CourseRow = {
  id: number;
  title_en: string;
  title_zh: string;
  content_type: "video" | "doc" | "mixed";
  video_url?: string | null;
  video_variants?: { label: string; url: string; mime_type?: string | null }[] | null;
  doc_url?: string | null;
  content_url?: string | null;
  content_file_name?: string | null;
  content_mime_type?: string | null;
};

type AccessRow = {
  id: string;
  course_id: number;
  status: string;
  progress: number;
  last_video_sec: number;
};

type SummaryRow = {
  content_md?: string | null;
  content_html?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
};

export function CoursePlayerClient({
  locale,
  course,
  access,
  initialSummary
}: {
  locale: "zh" | "en";
  course: CourseRow;
  access: AccessRow;
  initialSummary: SummaryRow | null;
}) {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [summaryHtml, setSummaryHtml] = React.useState(
    initialSummary?.content_html || initialSummary?.content_md || ""
  );
  const [summaryText, setSummaryText] = React.useState(initialSummary?.content_md || "");
  const [submittedAt, setSubmittedAt] = React.useState<string | null>(initialSummary?.submitted_at || null);
  const [reviewedAt, setReviewedAt] = React.useState<string | null>(initialSummary?.reviewed_at || null);
  const [reviewNote, setReviewNote] = React.useState<string | null>(initialSummary?.review_note || null);
  const [savingSummary, setSavingSummary] = React.useState(false);
  const [submittingSummary, setSubmittingSummary] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [savingProgress, setSavingProgress] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [captureBlocked, setCaptureBlocked] = React.useState(false);
  const [captureReason, setCaptureReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (access?.last_video_sec) {
      v.currentTime = Math.max(0, access.last_video_sec);
    }
  }, [access?.last_video_sec]);

  React.useEffect(() => {
    const html = initialSummary?.content_html || initialSummary?.content_md || "";
    setSummaryHtml(html);
    setSummaryText(initialSummary?.content_md || "");
    setSubmittedAt(initialSummary?.submitted_at || null);
    setReviewedAt(initialSummary?.reviewed_at || null);
    setReviewNote(initialSummary?.review_note || null);
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [
    initialSummary?.content_html,
    initialSummary?.content_md,
    initialSummary?.submitted_at,
    initialSummary?.reviewed_at,
    initialSummary?.review_note
  ]);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let lastSent = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSent < 10_000) return;
      lastSent = now;
      const sec = Math.floor(v.currentTime || 0);
      const duration = v.duration || 0;
      const progress = duration ? Math.min(99, Math.floor((sec / duration) * 100)) : null;
      setSavingProgress(true);
      fetch(`/api/system/courses/${course.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lastVideoSec: sec, progress })
      })
        .then(() => {})
        .finally(() => setSavingProgress(false));
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [course.id]);

  const videoSrc = React.useMemo(() => {
    if (course.video_url) return course.video_url;
    if (Array.isArray(course.video_variants)) {
      const fallback = course.video_variants.find((item) => item && item.url);
      return fallback?.url || null;
    }
    return null;
  }, [course.video_url, course.video_variants]);

  const pauseForSecurity = React.useCallback(
    (reason: string) => {
      const v = videoRef.current;
      if (v && !v.paused) v.pause();
      setCaptureBlocked(true);
      setCaptureReason(reason);
    },
    []
  );

  const resumePlayback = React.useCallback(() => {
    setCaptureBlocked(false);
    setCaptureReason(null);
    const v = videoRef.current;
    if (v) void v.play().catch(() => {});
  }, []);

  const checkCaptureDevices = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const suspicious = devices.some((device) =>
        /screen|capture|record|virtual|obs/i.test(String(device.label || ""))
      );
      if (suspicious) {
        pauseForSecurity(locale === "zh" ? "检测到录屏设备，已暂停播放。" : "Screen capture device detected.");
      }
    } catch {
      // ignore device enumeration errors
    }
  }, [locale, pauseForSecurity]);

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        pauseForSecurity(locale === "zh" ? "检测到切换窗口，已暂停播放。" : "Playback paused when you leave.");
      }
    };
    const handleBlur = () => {
      pauseForSecurity(locale === "zh" ? "检测到切换窗口，已暂停播放。" : "Playback paused when you leave.");
    };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", checkCaptureDevices);
    }
    void checkCaptureDevices();
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener("devicechange", checkCaptureDevices);
      }
    };
  }, [checkCaptureDevices, locale, pauseForSecurity]);

  const syncEditorState = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML || "";
    const text = el.innerText || el.textContent || "";
    setSummaryHtml(html);
    setSummaryText(text);
  }, []);

  const execFormat = React.useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      try {
        document.execCommand(command, false, value);
      } catch {
        // ignore formatting failures
      }
      syncEditorState();
    },
    [syncEditorState]
  );

  const insertHtml = React.useCallback(
    (html: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      try {
        document.execCommand("insertHTML", false, html);
      } catch {
        el.innerHTML += html;
      }
      syncEditorState();
    },
    [syncEditorState]
  );

  const uploadImage = React.useCallback(
    async (file: File) => {
      setError(null);
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/system/courses/${course.id}/notes/images`, { method: "POST", body: fd });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok || !json?.url) {
          throw new Error(json?.error || "upload_failed");
        }
        insertHtml(`<img src="${json.url}" alt="summary" />`);
      } catch {
        setError(locale === "zh" ? "图片上传失败" : "Image upload failed");
      } finally {
        setUploadingImage(false);
      }
    },
    [course.id, insertHtml, locale]
  );

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (!file) return;
    void uploadImage(file);
  };

  const saveSummary = async (submit: boolean) => {
    setError(null);
    const el = editorRef.current;
    const nextHtml = el?.innerHTML || summaryHtml;
    const nextText = el?.innerText || el?.textContent || summaryText;
    setSummaryHtml(nextHtml);
    setSummaryText(nextText);
    const trimmedText = nextText.trim();
    const trimmedHtml = nextHtml.trim();
    if (submit && !trimmedText && !trimmedHtml) {
      setError(locale === "zh" ? "请先输入总结/收获" : "Summary is required.");
      return;
    }
    submit ? setSubmittingSummary(true) : setSavingSummary(true);
    try {
      const res = await fetch(`/api/system/courses/${course.id}/notes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentHtml: nextHtml, contentText: nextText, submit })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(locale === "zh" ? "保存失败" : "Save failed");
      } else {
        if (submit) {
          setSubmittedAt(new Date().toISOString());
          setReviewedAt(null);
          setReviewNote(null);
        }
        router.refresh();
      }
    } catch {
      setError(locale === "zh" ? "网络错误" : "Network error");
    } finally {
      submit ? setSubmittingSummary(false) : setSavingSummary(false);
    }
  };

  const complete = async () => {
    setError(null);
    const res = await fetch(`/api/system/courses/${course.id}/complete`, { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setError(locale === "zh" ? "操作失败" : "Failed");
      return;
    }
    router.replace(`/${locale}/system/courses`);
  };

  const summaryStatus = reviewedAt
    ? locale === "zh"
      ? "已阅"
      : "Reviewed"
    : submittedAt
      ? locale === "zh"
        ? "已提交等待审核，请勿重复提交"
        : "Submitted (waiting for review)"
      : null;
  const hasSummary = summaryText.trim().length > 0 || summaryHtml.trim().length > 0;

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
      <aside className="hidden xl:block rounded-3xl border border-white/10 bg-white/5 p-4 overflow-y-auto">
        <div className="text-white/85 font-semibold">{locale === "zh" ? "课程目录" : "Course tree"}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Array.from({ length: 21 }).map((_, i) => {
            const id = i + 1;
            return (
              <a
                key={id}
                href={`/${locale}/system/courses/${id}`}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  id === course.id
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/0 border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {locale === "zh" ? `第${id}课` : `L${id}`}
              </a>
            );
          })}
        </div>
      </aside>

      <main className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden min-h-0 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="text-white/90 font-semibold text-lg">{locale === "zh" ? course.title_zh : course.title_en}</div>
          <div className="mt-1 text-xs text-white/50 flex items-center gap-2">
            <span>{savingProgress ? (locale === "zh" ? "进度保存中..." : "Saving...") : null}</span>
            <span className="ml-auto">
              <button
                type="button"
                onClick={complete}
                className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
              >
                {locale === "zh" ? "标记完成" : "Mark complete"}
              </button>
            </span>
          </div></div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {videoSrc ? (
            <video
              ref={videoRef}
              className="h-full w-full"
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              src={videoSrc || undefined}
            />
          ) : course.doc_url ? (
            <iframe className="h-full w-full" src={course.doc_url || undefined} />
          ) : course.content_url ? (
            <div className="p-6">
              <div className="text-white/80 font-semibold">{locale === "zh" ? "课程内容文件" : "Course content file"}</div>
              <div className="mt-2 text-sm text-white/60 break-all">
                {course.content_file_name || course.content_mime_type || ""}
              </div>
              <div className="mt-4">
                <a
                  href={course.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                >
                  {locale === "zh" ? "打开/下载" : "Open / Download"}
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 text-white/60">
              {locale === "zh" ? "课程内容未配置。" : "Content not configured."}
            </div>
          )}
          {captureBlocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <div className="text-center max-w-md">
                <div className="text-white/90 font-semibold">{locale === "zh" ? "播放已暂停" : "Playback paused"}</div>
                <div className="mt-2 text-sm text-white/70">
                  {captureReason ||
                    (locale === "zh"
                      ? "检测到疑似录屏行为，已暂停播放。"
                      : "Potential screen recording detected.")}
                </div>
                <button
                  type="button"
                  onClick={resumePlayback}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                >
                  {locale === "zh" ? "继续播放" : "Resume"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 min-h-0 flex flex-col">
        <div className="text-white/85 font-semibold">
          {locale === "zh" ? "\u603b\u7ed3/\u6536\u83b7" : "Summary / Takeaways"}
        </div>
        <div className="mt-2 text-xs text-white/50">
          {locale === "zh" ? "\u652f\u6301\u52a0\u7c97 / \u659c\u4f53 / \u56fe\u7247\u4e0a\u4f20" : "Bold, italic, and image uploads"}
        </div>

        {summaryStatus ? <div className="mt-3 text-xs text-sky-100/80">{summaryStatus}</div> : null}

        {reviewNote ? (
          <div className="mt-2 rounded-2xl border border-sky-200/10 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            {locale === "zh" ? "\u5ba1\u6279\u5185\u5bb9" : "Review note"}: {reviewNote}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => execFormat("bold")}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execFormat("italic")}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            I
          </button>
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locale === "zh" ? "\u56fe\u7247" : "Image"}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={onImageChange}
            className="hidden"
          />
        </div>

        <div
          ref={editorRef}
          className="summary-editor mt-3 flex-1 min-h-0 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-white/85 text-sm overflow-y-auto"
          contentEditable
          onInput={syncEditorState}
          data-placeholder={locale === "zh" ? "\u8bb0\u5f55\u4f60\u7684\u603b\u7ed3/\u6536\u83b7..." : "Write your summary..."}
          suppressContentEditableWarning
        />

        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={savingSummary || submittingSummary}
            onClick={() => saveSummary(false)}
            className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
          >
            {locale === "zh" ? "\u4fdd\u5b58" : "Save"}
          </button>
          <button
            type="button"
            disabled={!hasSummary || savingSummary || submittingSummary}
            onClick={() => saveSummary(true)}
            className="ml-auto px-3 py-1.5 rounded-xl bg-white/15 border border-white/30 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingSummary
              ? locale === "zh"
                ? "\u63d0\u4ea4\u4e2d..."
                : "Submitting..."
              : locale === "zh"
                ? "\u63d0\u4ea4"
                : "Submit"}
          </button>
        </div>
      </aside>
    </div>
  );
}

