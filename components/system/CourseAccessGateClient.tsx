"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/system/StatusBadge";

export function CourseAccessGateClient({
  locale,
  courseId,
  status,
  rejectionReason,
  blocked,
  blockedReason
}: {
  locale: "zh" | "en";
  courseId: number;
  status: "none" | "requested" | "approved" | "rejected" | "completed";
  rejectionReason?: string | null;
  blocked?: boolean;
  blockedReason?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const canRequest = status === "none" || status === "rejected";

  const request = async () => {
    if (!canRequest || blocked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/courses/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const code = String(json?.error || "REQUEST_FAILED");
        if (code === "PREV_SUMMARY_REQUIRED") {
          setError(locale === "zh" ? "请先提交上一课总结/收获" : "Submit the previous summary first.");
        } else {
          setError(locale === "zh" ? "申请失败，请稍后再试。" : "Request failed. Please try again.");
        }
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <div className="text-white/90 font-semibold text-xl">
            {locale === "zh" ? `第${courseId}课` : `Lesson ${courseId}`}
          </div>
          <div className="ml-auto">{status === "none" ? null : <StatusBadge value={status} locale={locale} />}</div>
        </div>
        <div className="mt-3 text-white/60 text-sm leading-6">
          {status === "requested"
            ? locale === "zh"
              ? "已提交申请，等待管理员审批。"
              : "Request submitted. Waiting for admin approval."
            : status === "rejected"
              ? locale === "zh"
                ? `申请被拒绝：${rejectionReason || "-"}`
                : `Rejected: ${rejectionReason || "-"}`
              : locale === "zh"
                ? "你尚未获得该课程的学习权限。"
                : "You don't have access to this course yet."}
        </div>


        {blocked && blockedReason ? (
          <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {blockedReason}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {canRequest ? (
            <button
              type="button"
              disabled={loading || blocked}
              onClick={request}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (locale === "zh" ? "\u63d0\u4ea4\u4e2d..." : "Submitting...") : locale === "zh" ? "\u7533\u8bf7\u5b66\u4e60" : "Request access"}
            </button>
          ) : null}
          <a
            className="ml-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
            href={`/${locale}/system/courses`}
          >
            {locale === "zh" ? "返回课程列表" : "Back to courses"}
          </a>
        </div>
      </div>
    </div>
  );
}

