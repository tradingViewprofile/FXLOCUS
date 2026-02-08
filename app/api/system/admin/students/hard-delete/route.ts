import { NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string().uuid(),
  confirm: z.literal("HARD_DELETE")
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const ctx = await requireManager();
    const role = ctx.user.role;
    if (role !== "super_admin" && role !== "leader") {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();
    const userId = parsed.data.userId;

    const { data: target, error: targetErr } = await admin.from("profiles").select("id,role").eq("id", userId).maybeSingle();
    if (targetErr) return json({ ok: false, error: targetErr.message }, 500);
    if (!target?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    const learnerRoles = ["student", "trader", "coach"];
    if (!learnerRoles.includes(target.role)) return json({ ok: false, error: "FORBIDDEN" }, 403);

    if (role === "leader") {
      const treeIds = await fetchLeaderTreeIds(admin, ctx.user.id);
      if (!treeIds.includes(userId)) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const cleanups = [
      { table: "course_access", column: "reviewed_by" },
      { table: "course_notes", column: "reviewed_by" },
      { table: "file_permissions", column: "granted_by" },
      { table: "file_access_requests", column: "reviewed_by" },
      { table: "trade_submissions", column: "reviewed_by" },
      { table: "trade_submissions", column: "archived_by" },
      { table: "classic_trades", column: "reviewed_by" },
      { table: "weekly_summaries", column: "reviewed_by" },
      { table: "ladder_authorizations", column: "reviewed_by" },
      { table: "ladder_snapshots", column: "created_by" },
      { table: "files", column: "uploaded_by" }
    ];

    for (const cleanup of cleanups) {
      const { error } = await admin
        .from(cleanup.table)
        .update({ [cleanup.column]: null } as any)
        .eq(cleanup.column, userId);
      if (error) return json({ ok: false, error: error.message }, 500);
    }

    const { error: profileErr } = await admin.from("profiles").delete().eq("id", userId);
    if (profileErr && !String(profileErr.message || "").toLowerCase().includes("not found")) {
      return json({ ok: false, error: profileErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
