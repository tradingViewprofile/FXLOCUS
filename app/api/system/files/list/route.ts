import { NextRequest, NextResponse } from "next/server";

import { requireLearner } from "@/lib/system/guard";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireLearner();
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    // Prefer a single SQL function (reduces join layers + roundtrips). Fallback to legacy multi-query logic.
    const rpc = await supabase.rpc("list_public_files_for_me", {
      _from: from,
      _to: to,
      _user_id: user.id
    });
    let files: any[] = [];
    let total: number | null = null;

    if (!rpc.error && Array.isArray(rpc.data)) {
      files = rpc.data.map((row: any) => ({
        id: row.id,
        category: row.category,
        name: row.name,
        description: row.description,
        size_bytes: row.size_bytes,
        mime_type: row.mime_type,
        created_at: row.created_at,
        can_download: Boolean(row.can_download),
        request_status: row.request_status || "none",
        rejection_reason: row.rejection_reason || null,
        requested_at: row.requested_at || null,
        reviewed_at: row.reviewed_at || null
      }));
      total = rpc.data.length ? Number(rpc.data[0]?.total_count || 0) : 0;
    } else {
      const msg = String(rpc.error?.message || "").toLowerCase();
      const missingFn = msg.includes("does not exist") || msg.includes("function") || msg.includes("schema cache");
      if (!missingFn && rpc.error) return json({ ok: false, error: rpc.error.message }, 500);

      const [filesRes, permsRes, reqRes] = await Promise.all([
        supabase
          .from("files")
          .select("id,category,name,description,size_bytes,mime_type,created_at", { count: "exact" })
          .is("course_id", null)
          .is("lesson_id", null)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase.from("file_permissions").select("file_id").eq("grantee_profile_id", user.id),
        supabase
          .from("file_access_requests")
          .select("file_id,status,rejection_reason,requested_at,reviewed_at")
          .eq("user_id", user.id)
      ]);

      if (filesRes.error) return json({ ok: false, error: filesRes.error.message }, 500);
      if (permsRes.error) return json({ ok: false, error: permsRes.error.message }, 500);

      let requests: any[] = [];
      if (reqRes.error) {
        const m = String(reqRes.error.message || "");
        if (!m.toLowerCase().includes("does not exist")) {
          return json({ ok: false, error: reqRes.error.message }, 500);
        }
      } else {
        requests = reqRes.data || [];
      }

      const allowed = new Set((permsRes.data || []).map((p: any) => p.file_id).filter(Boolean));
      const reqByFile = new Map(requests.map((r: any) => [r.file_id, r]));

      files = (filesRes.data || []).map((f: any) => {
        const reqRow = reqByFile.get(f.id);
        return {
          ...f,
          can_download: allowed.has(f.id),
          request_status: reqRow?.status || "none",
          rejection_reason: reqRow?.rejection_reason || null,
          requested_at: reqRow?.requested_at || null,
          reviewed_at: reqRow?.reviewed_at || null
        };
      });
      total = filesRes.count ?? files.length;
    }

    return json({
      ok: true,
      files,
      page,
      pageSize,
      total: total ?? files.length
    });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
