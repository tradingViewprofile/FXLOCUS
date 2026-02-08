import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";
import { getPagination } from "@/lib/system/pagination";
import { fetchStudentSupportNames } from "@/lib/system/studentSupport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TypeParam = z.enum(["trade_log", "trade_strategy"]);
const CoachParam = z.string().uuid();

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const typeRaw = req.nextUrl.searchParams.get("type") || "";
    const parsedType = TypeParam.safeParse(typeRaw);
    if (!parsedType.success) return json({ ok: false, error: "INVALID_TYPE" }, 400);
    const type = parsedType.data;
    const coachRaw = (req.nextUrl.searchParams.get("coachId") || "").trim();
    const parsedCoach = coachRaw ? CoachParam.safeParse(coachRaw) : null;
    if (coachRaw && !parsedCoach?.success) return json({ ok: false, error: "INVALID_COACH" }, 400);
    const coachId = parsedCoach?.success ? parsedCoach.data : "";

    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    const admin = supabaseAdmin();
    const db = user.role === "coach" || user.role === "assistant" ? admin : supabase;

    let query = db
      .from("trade_submissions")
      .select(
        "id,user_id,leader_id,type,status,rejection_reason,review_note,created_at,user:profiles!trade_submissions_user_id_fkey(full_name,email,phone)",
        { count: "exact" }
      )
      .eq("type", type)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (coachId) {
      if (user.role === "assistant") return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (user.role === "coach" && coachId !== user.id) return json({ ok: false, error: "FORBIDDEN" }, 403);
      if (user.role === "leader") {
        const treeIds = await fetchLeaderTreeIds(supabase, user.id);
        if (!treeIds.includes(coachId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
      const { data: assignedRows, error: assignedErr } = await supabase
        .from("coach_assignments")
        .select("assigned_user_id")
        .eq("coach_id", coachId);
      if (assignedErr) return json({ ok: false, error: assignedErr.message }, 500);
      const assignedIds = (assignedRows || []).map((row: any) => row.assigned_user_id).filter(Boolean);
      if (!assignedIds.length) return json({ ok: true, items: [] });
      query = query.in("user_id", assignedIds);
    } else if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!treeIds.length) return json({ ok: true, items: [] });
      query = query.in("user_id", treeIds);
    } else if (user.role === "coach") {
      const assignedIds = await fetchCoachAssignedUserIds(supabase, user.id);
      if (!assignedIds.length) return json({ ok: true, items: [] });
      query = query.in("user_id", assignedIds);
    } else if (user.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, user.id);
      if (!createdIds.length) return json({ ok: true, items: [] });
      query = query.in("user_id", createdIds);
    }

    const { data: submissions, error, count } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const ids = (submissions || []).map((s: any) => s.id);
    const { data: files, error: filesErr } = ids.length
      ? await db.from("trade_submission_files").select("*").in("submission_id", ids)
      : ({ data: [], error: null } as any);

    if (filesErr) return json({ ok: false, error: filesErr.message }, 500);

    const filesBySubmission = new Map<string, any[]>();
    (files || []).forEach((f: any) => {
      const list = filesBySubmission.get(f.submission_id) || [];
      list.push(f);
      filesBySubmission.set(f.submission_id, list);
    });

    const supportMap = await fetchStudentSupportNames(admin, (submissions || []).map((s: any) => s.user_id));

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
        const support = supportMap.get(String(s.user_id || "")) || null;
        return {
          ...s,
          files: nextFiles,
          support_name: support?.displayName || null
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
