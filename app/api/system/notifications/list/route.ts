import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cacheJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=45" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireSystemUser();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });
    const { data, error, count } = await supabase
      .from("notifications")
      .select("id,title,content,from_user_id,read_at,created_at", { count: "exact" })
      .eq("to_user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return cacheJson({ ok: false, error: error.message }, 500);
    return cacheJson({ ok: true, items: data || [], page, pageSize, total: count ?? (data || []).length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return cacheJson({ ok: false, error: code }, status);
  }
}
