import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
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
    const { user, supabase } = await requireManager();
    if (user.role === "coach") return json({ ok: false, error: "FORBIDDEN" }, 403);
    const admin = supabaseAdmin();
    const db = user.role === "assistant" ? admin : supabase;
    const leaderId = (req.nextUrl.searchParams.get("leaderId") || "").trim();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    let query = db
      .from("classic_trades")
      .select(
        "id,user_id,leader_id,reason,review_note,reviewed_at,created_at,image_bucket,image_path,image_name,image_mime_type,user:profiles!classic_trades_user_id_fkey(full_name,email,phone,leader_id)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", treeIds);
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", createdIds);
    } else if (leaderId) {
      const treeIds = await fetchLeaderTreeIds(supabase, leaderId);
      if (!treeIds.length) return json({ ok: true, items: [], leaders: [] });
      query = query.in("user_id", treeIds);
    }

    const { data: rows, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    let leaders: Array<{ id: string; full_name: string | null; email: string | null }> = [];
    if (user.role === "super_admin") {
      const { data: leaderRows, error: leaderErr } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("role", "leader")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!leaderErr && Array.isArray(leaderRows)) leaders = leaderRows as any;
    }

    const items = await Promise.all(
      (rows || []).map(async (row: any) => {
        const signedUrl = await createSignedDownloadUrl(admin, row.image_bucket, row.image_path, 3600);
        return {
          id: row.id,
          user_id: row.user_id,
          leader_id: row.leader_id,
          reason: row.reason,
          review_note: row.review_note,
          reviewed_at: row.reviewed_at,
          created_at: row.created_at,
          image_name: row.image_name,
          image_mime_type: row.image_mime_type,
          image_url: signedUrl,
          user: row.user || null
        };
      })
    );

    return json({ ok: true, items, leaders, page, pageSize, total: count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
