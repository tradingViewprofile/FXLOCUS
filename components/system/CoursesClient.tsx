"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { StatusBadge } from "./StatusBadge";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { usePagination } from "@/components/ui/usePagination";

type CourseRow = {
  id: number;
  title_en: string;
  title_zh: string;
  summary_en?: string | null;
  summary_zh?: string | null;
  content_file_name?: string | null;
  content_path?: string | null;
};

type AccessRow = {
  course_id: number;
  status: "requested" | "approved" | "rejected" | "completed";
  rejection_reason?: string | null;
  progress?: number | null;
};

type NoteRow = {
  course_id: number;
  submitted_at?: string | null;
};

export function CoursesClient({
  locale,
  courses,
  access,
  notes
}: {
  locale: "zh" | "en";
  courses: CourseRow[];
  access: AccessRow[];
  notes: NoteRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<number | null>(null);
  const [accessItems, setAccessItems] = React.useState<AccessRow[]>(access);

  const accessById = React.useMemo(() => new Map(accessItems.map((a) => [a.course_id, a])), [accessItems]);
  const submittedByCourseId = React.useMemo(() => {
    const set = new Set<number>();
    notes.forEach((n) => {
      if (n?.submitted_at) set.add(Number(n.course_id));
    });
    return set;
  }, [notes]);
  const { pageItems, page, pageSize, setPage, setPageSize, pageCount, total } =
    usePagination(courses);

  React.useEffect(() => {
    setAccessItems(access);
  }, [access]);

  const request = async (courseId: number) => {
    const ok = window.confirm(locale === "zh" ? "确认申请该课程？" : "Request access to this course?");
    if (!ok) return;
    setLoadingId(courseId);
    try {
      const res = await fetch("/api/system/courses/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "课程" : "Courses"}</div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh"
            ? "申请课程权限，通过后即可进入学习。"
            : "Request course access. Once approved you can start learning."}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageItems.map((c) => {
          const a = accessById.get(c.id);
          const status = a?.status || "none";
          const canEnter = status === "approved" || status === "completed";
          const prevRequired = c.id > 1 && !submittedByCourseId.has(c.id - 1);
          const disableRequest = prevRequired && (status === "none" || status === "rejected");
          return (
            <div key={c.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <div className="text-white/90 font-semibold">
                  {locale === "zh" ? `第${c.id}课` : `Lesson ${c.id}`}
                </div>
                <div className="ml-auto">
                  {status === "none" ? (
                    <span className="text-xs text-white/50">{locale === "zh" ? "未申请" : "Not requested"}</span>
                  ) : (
                    <StatusBadge value={status} locale={locale} />
                  )}
                </div>
              </div>

              <div className="mt-2 text-white text-lg font-semibold">
                {locale === "zh" ? c.title_zh : c.title_en}
              </div>
              <div className="mt-2 text-sm text-white/65 leading-6 line-clamp-3">
                {locale === "zh" ? c.summary_zh : c.summary_en}
              </div>
              <div className="mt-3 text-xs text-white/55">
                {c.content_path || c.content_file_name
                  ? locale === "zh"
                    ? `已上传资料：${c.content_file_name || c.content_path}`
                    : `Content: ${c.content_file_name || c.content_path}`
                  : locale === "zh"
                    ? "未上传资料"
                    : "No content uploaded"}
              </div>

              {a?.status === "rejected" && a.rejection_reason ? (
                <div className="mt-3 text-xs text-rose-200/90">
                  {locale === "zh" ? "拒绝原因：" : "Reason: "} {a.rejection_reason}
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                {canEnter ? (
                  <a
                    href={`/${locale}/system/courses/${c.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                  >
                    {locale === "zh" ? "进入学习" : "Open"}
                  </a>
                ) : null}

                {status === "none" || status === "rejected" ? (
                  <button
                    type="button"
                    disabled={loadingId === c.id || disableRequest}
                    onClick={() => (disableRequest ? null : request(c.id))}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {locale === "zh" ? "申请学习" : "Request access"}
                  </button>
                ) : null}

                {status === "requested" ? (
                  <div className="text-xs text-white/50">{locale === "zh" ? "等待审批…" : "Waiting…"}</div>
                ) : null}



                {disableRequest ? (
                  <div className="text-xs text-amber-200/80">
                    {locale === "zh" ? "\u8bf7\u5148\u63d0\u4ea4\u4e0a\u4e00\u8bfe\u603b\u7ed3" : "Submit the previous summary first"}
                  </div>
                ) : null}
                {typeof a?.progress === "number" ? (
                  <div className="ml-auto text-xs text-white/50">{a.progress}%</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {courses.length ? (
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
  );
}
