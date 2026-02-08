import { NextRequest, NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/system/guard";
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
    const { supabase } = await requireSuperAdmin();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 50, maxPageSize: 200 });

    const { data, error, count } = await supabase
      .from("profiles")
      .select("id,email,full_name,phone,role,status,created_at,last_login_at", { count: "exact" })
      .eq("role", "leader")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, items: data || [], page, pageSize, total: count ?? (data || []).length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

