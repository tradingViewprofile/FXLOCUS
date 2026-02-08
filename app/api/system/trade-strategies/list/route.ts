import { NextRequest, NextResponse } from "next/server";

import { requireLearner } from "@/lib/system/guard";
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
    const { user } = await requireLearner();
    const admin = supabaseAdmin();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    const { data: submissions, error, count } = await admin
      .from("trade_submissions")
      .select("id,status,rejection_reason,review_note,created_at", { count: "exact" })
      .eq("user_id", user.id)
      .eq("type", "trade_strategy")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return json({ ok: false, error: error.message }, 500);

    const ids = (submissions || []).map((s: any) => s.id);
    const { data: files, error: filesErr } = ids.length
      ? await admin.from("trade_submission_files").select("*").in("submission_id", ids)
      : ({ data: [], error: null } as any);

    if (filesErr) return json({ ok: false, error: filesErr.message }, 500);

    const filesBySubmission = new Map<string, any[]>();
    (files || []).forEach((f: any) => {
      const list = filesBySubmission.get(f.submission_id) || [];
      list.push(f);
      filesBySubmission.set(f.submission_id, list);
    });

    const items = await Promise.all(
      (submissions || []).map(async (s: any) => {
        const list = filesBySubmission.get(s.id) || [];
        const nextFiles = await Promise.all(
          list.map(async (f) => {
            const signed = await createSignedDownloadUrl(admin, f.storage_bucket, f.storage_path, 3600);
            return {
              id: f.id,
              file_name: f.file_name,
              mime_type: f.mime_type || null,
              size_bytes: f.size_bytes || 0,
              url: signed || null
            };
          })
        );
        return { ...s, files: nextFiles };
      })
    );

    return json({ ok: true, items, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
