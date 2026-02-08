import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { removeStoredObjects } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  submissionId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const { submissionId } = parsed.data;
    const { data: submission, error } = await supabase
      .from("trade_submissions")
      .select("id,user_id,archived_at")
      .eq("id", submissionId)
      .maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!submission?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    if (!submission.archived_at) return json({ ok: false, error: "NOT_ARCHIVED" }, 400);

    if (user.role === "leader") {
      const scopeIds = await fetchLeaderTreeIds(supabase, user.id);
      if (!scopeIds.includes(submission.user_id)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
    }

    const admin = supabaseAdmin();
    const { data: files, error: filesErr } = await admin
      .from("trade_submission_files")
      .select("storage_bucket,storage_path")
      .eq("submission_id", submissionId);
    if (filesErr) return json({ ok: false, error: filesErr.message }, 500);

    const stored = (files || [])
      .filter((row: any) => row?.storage_bucket && row?.storage_path)
      .map((row: any) => ({ bucket: row.storage_bucket, path: row.storage_path }));
    if (stored.length) {
      await removeStoredObjects(admin, stored);
    }

    await admin.from("trade_submission_files").delete().eq("submission_id", submissionId);
    await admin.from("trade_submissions").delete().eq("id", submissionId);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
