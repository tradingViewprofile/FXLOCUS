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

    const { data: rows, error, count } = await admin
      .from("classic_trades")
      .select(
        "id,reason,review_note,reviewed_at,created_at,image_bucket,image_path,image_name,image_mime_type",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return json({ ok: false, error: error.message }, 500);

    const items = await Promise.all(
      (rows || []).map(async (row: any) => {
        const signedUrl = await createSignedDownloadUrl(admin, row.image_bucket, row.image_path, 3600);
        return {
          id: row.id,
          reason: row.reason,
          review_note: row.review_note,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
          image_name: row.image_name,
          image_mime_type: row.image_mime_type,
          image_url: signedUrl
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
