import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { fetchStudentSupportNames } from "@/lib/system/studentSupport";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
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
    const { user } = await requireSystemUser();
    if (!(user.role === "super_admin" || user.role === "leader" || user.role === "assistant")) {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const admin = supabaseAdmin();
    const learnerRoles = ["student", "trader", "coach", "leader"];
    const scopeIds =
      user.role === "leader"
        ? await fetchLeaderTreeIds(admin, user.id)
        : user.role === "assistant"
          ? await fetchAssistantCreatedUserIds(admin, user.id)
          : null;

    const { page, pageSize } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    const q = await admin
      .from("file_access_requests")
      .select("user_id,file_id,status,requested_at")
      .eq("status", "requested")
      .order("requested_at", { ascending: false })
      .limit(500);

    if (q.error) return json({ ok: false, error: q.error.message }, 500);

    const rows = q.data || [];
    const userIds = Array.from(new Set<string>(rows.map((r: any) => String(r.user_id || "")).filter(Boolean)));
    const fileIds = Array.from(new Set<string>(rows.map((r: any) => String(r.file_id || "")).filter(Boolean)));

    let scopedUserIds = userIds;
    if (scopeIds && scopeIds.length) {
      const scopeSet = new Set<string>((scopeIds || []).map(String).filter(Boolean));
      scopedUserIds = userIds.filter((id: string) => scopeSet.has(id));
      if (!scopedUserIds.length) return json({ ok: true, items: [] });
    }

    let usersQuery = admin
      .from("profiles")
      .select("id,full_name,email,phone,leader_id,role")
      .in("id", scopedUserIds)
      .in("role", learnerRoles);

    const [usersRes, filesRes] = await Promise.all([
      scopedUserIds.length ? usersQuery : Promise.resolve({ data: [], error: null } as any),
      fileIds.length
        ? admin
            .from("files")
            .select("id,category,name,description,size_bytes,mime_type,created_at")
            .in("id", fileIds)
        : Promise.resolve({ data: [], error: null } as any)
    ]);

    if (usersRes.error) return json({ ok: false, error: usersRes.error.message }, 500);
    if (filesRes.error) return json({ ok: false, error: filesRes.error.message }, 500);

    const usersById = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
    const supportMap = await fetchStudentSupportNames(admin, scopedUserIds);
    const filteredRows = rows.filter((r: any) => usersById.has(r.user_id));
    const filteredFileIds = Array.from(new Set(filteredRows.map((r: any) => String(r.file_id)).filter(Boolean)));

    if ((user.role === "leader" || user.role === "assistant") && filteredFileIds.length !== fileIds.length) {
      const { data: scopedFiles, error: scopedFilesErr } = filteredFileIds.length
        ? await admin
            .from("files")
            .select("id,category,name,description,size_bytes,mime_type,created_at")
            .in("id", filteredFileIds)
        : ({ data: [], error: null } as any);
      if (scopedFilesErr) return json({ ok: false, error: scopedFilesErr.message }, 500);
      const scopedFilesById = new Map((scopedFiles || []).map((f: any) => [f.id, f]));
      const items = filteredRows.map((r: any) => ({
        user_id: r.user_id,
        file_id: r.file_id,
        status: r.status,
        requested_at: r.requested_at,
        user: (() => {
          const base = usersById.get(r.user_id);
          if (!base) return null;
          const support = supportMap.get(String(r.user_id));
          return {
            ...base,
            support_name: support?.displayName || null,
            assistant_name: support?.assistantName || null,
            coach_name: support?.coachName || null
          };
        })(),
        file: scopedFilesById.get(r.file_id) || null
      }));
      const total = items.length;
      const start = (page - 1) * pageSize;
      const paged = items.slice(start, start + pageSize);
      return json({ ok: true, items: paged, page, pageSize, total });
    }

    const filesById = new Map((filesRes.data || []).map((f: any) => [f.id, f]));

    const items = filteredRows.map((r: any) => ({
      user_id: r.user_id,
      file_id: r.file_id,
      status: r.status,
      requested_at: r.requested_at,
      user: (() => {
        const base = usersById.get(r.user_id);
        if (!base) return null;
        const support = supportMap.get(String(r.user_id));
        return {
          ...base,
          support_name: support?.displayName || null,
          assistant_name: support?.assistantName || null,
          coach_name: support?.coachName || null
        };
      })(),
      file: filesById.get(r.file_id) || null
    }));

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

