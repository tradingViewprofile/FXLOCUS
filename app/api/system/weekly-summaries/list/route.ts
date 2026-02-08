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

async function signedUrl(
  admin: ReturnType<typeof supabaseAdmin>,
  bucket: string | null,
  path: string | null
) {
  if (!bucket || !path) return null;
  return createSignedDownloadUrl(admin, bucket, path, 3600);
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireLearner();
    const admin = supabaseAdmin();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    const { data: rows, error, count } = await admin
      .from("weekly_summaries")
      .select(
        [
          "id",
          "student_name",
          "summary_text",
          "review_note",
          "reviewed_at",
          "created_at",
          "strategy_bucket",
          "strategy_path",
          "strategy_name",
          "strategy_mime_type",
          "curve_bucket",
          "curve_path",
          "curve_name",
          "curve_mime_type",
          "stats_bucket",
          "stats_path",
          "stats_name",
          "stats_mime_type"
        ].join(",")
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return json({ ok: false, error: error.message }, 500);

    const items = await Promise.all(
      (rows || []).map(async (row: any) => {
        const strategyUrl = await signedUrl(admin, row.strategy_bucket, row.strategy_path);
        const curveUrl = await signedUrl(admin, row.curve_bucket, row.curve_path);
        const statsUrl = await signedUrl(admin, row.stats_bucket, row.stats_path);
        return {
          id: row.id,
          student_name: row.student_name,
          summary_text: row.summary_text,
          review_note: row.review_note,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
          strategy_name: row.strategy_name,
          strategy_mime_type: row.strategy_mime_type,
          strategy_url: strategyUrl,
          curve_name: row.curve_name,
          curve_mime_type: row.curve_mime_type,
          curve_url: curveUrl,
          stats_name: row.stats_name,
          stats_mime_type: row.stats_mime_type,
          stats_url: statsUrl
        };
      })
    );

    return json({ ok: true, items, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
