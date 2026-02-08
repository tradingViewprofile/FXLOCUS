import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireManager();
    const { page, pageSize } = getPagination(req, { defaultPageSize: 20, maxPageSize: 100 });

    const admin = supabaseAdmin();
    const studentId = String(req.nextUrl.searchParams.get("studentId") || "").trim();

    let scopedIds: string[] | null = null;
    if (user.role === "leader") {
      scopedIds = await fetchLeaderTreeIds(admin, user.id);
    } else if (user.role === "coach") {
      scopedIds = await fetchCoachAssignedUserIds(admin, user.id);
    } else if (user.role === "assistant") {
      scopedIds = await fetchAssistantCreatedUserIds(admin, user.id);
    } else if (user.role === "super_admin") {
      scopedIds = null;
    } else {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    if (studentId && scopedIds && !scopedIds.includes(studentId)) {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const baseFields =
      "id,student_id,doc_type,file_name,mime_type,size_bytes,created_at,storage_bucket,storage_path,student:profiles!student_documents_student_id_fkey(full_name,email,student_status,status,leader_id)";
    const reviewFields = `${baseFields},reviewed_at,reviewed_by`;

    const buildQuery = (fields: string) => {
    let query = admin
      .from("student_documents")
      .select(fields)
      .order("created_at", { ascending: false })
      .limit(500);
      if (scopedIds) {
        if (!scopedIds.length) return null;
        query = query.in("student_id", scopedIds);
      }
      if (studentId) query = query.eq("student_id", studentId);
      return query;
    };

    const initialQuery = buildQuery(reviewFields);
    if (!initialQuery) return json({ ok: true, items: [] });

    let { data, error } = await initialQuery;
    if (error?.code === "42703") {
      const retryQuery = buildQuery(baseFields);
      if (!retryQuery) return json({ ok: true, items: [] });
      const retry = await retryQuery;
      data = retry.data as any;
      error = retry.error;
    }
    if (error) {
      const message = String(error.message || "");
      if (message.includes("student_documents") || message.includes("schema cache")) {
        return json({ ok: true, items: [], warning: "student_documents_missing" });
      }
      return json({ ok: false, error: message }, 500);
    }

    const docs = await Promise.all(
      (data || []).map(async (row: any) => {
        let url: string | null = null;
        if (row.storage_bucket && row.storage_path) {
          url = await createSignedDownloadUrl(admin, row.storage_bucket, row.storage_path, 3600);
        }
        return {
          id: row.id,
          student_id: row.student_id,
          doc_type: row.doc_type,
          file_name: row.file_name,
          mime_type: row.mime_type,
          size_bytes: row.size_bytes,
          created_at: row.created_at,
          reviewed_at: row.reviewed_at,
          reviewed_by: row.reviewed_by,
          url,
          student: row.student || null
        };
      })
    );

    const grouped = new Map<
      string,
      {
        student_id: string;
        student: any;
        docs: {
          enrollment_form?: any;
          trial_screenshot?: any;
          verification_image: any[];
        };
        latest_at: string | null;
        reviewed: boolean;
      }
    >();

    docs.forEach((doc) => {
      const studentId = String(doc.student_id || "");
      if (!studentId) return;
      let entry = grouped.get(studentId);
      if (!entry) {
        entry = {
          student_id: studentId,
          student: doc.student || null,
          docs: { verification_image: [] },
          latest_at: doc.created_at || null,
          reviewed: true
        };
        grouped.set(studentId, entry);
      }
      if (doc.doc_type === "verification_image") {
        entry.docs.verification_image.push(doc);
      } else if (doc.doc_type === "enrollment_form") {
        if (!entry.docs.enrollment_form) entry.docs.enrollment_form = doc;
      } else if (doc.doc_type === "trial_screenshot") {
        if (!entry.docs.trial_screenshot) entry.docs.trial_screenshot = doc;
      }

      if (doc.created_at) {
        const current = entry.latest_at ? new Date(entry.latest_at).getTime() : 0;
        const candidate = new Date(doc.created_at).getTime();
        if (!current || candidate > current) entry.latest_at = doc.created_at;
      }

      if (!doc.reviewed_at) entry.reviewed = false;
    });

    const items = Array.from(grouped.values()).sort((a, b) => {
      const aTime = a.latest_at ? new Date(a.latest_at).getTime() : 0;
      const bTime = b.latest_at ? new Date(b.latest_at).getTime() : 0;
      return bTime - aTime;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    return json({ ok: true, items: paged, page, pageSize, total });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
