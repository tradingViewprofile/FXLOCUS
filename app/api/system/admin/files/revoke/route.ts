import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  fileId: z.string().uuid(),
  userId: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user: actor } = await requireAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();
    const learnerRoles = ["student", "trader", "coach"];
    if (actor.role === "leader") {
      const { data: target } = await admin
        .from("profiles")
        .select("id,role")
        .eq("id", parsed.data.userId)
        .maybeSingle();
      if (!target?.id || !learnerRoles.includes(target.role)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
      const treeIds = await fetchLeaderTreeIds(admin, actor.id);
      if (!treeIds.includes(target.id)) {
        return json({ ok: false, error: "FORBIDDEN" }, 403);
      }
    }

    const now = new Date().toISOString();
    const del = await admin
      .from("file_permissions")
      .delete()
      .eq("file_id", parsed.data.fileId)
      .eq("grantee_profile_id", parsed.data.userId);
    if (del.error) return json({ ok: false, error: del.error.message }, 500);

    await admin
      .from("file_access_requests")
      .update({
        status: "rejected",
        reviewed_at: now,
        reviewed_by: actor.id,
        rejection_reason: "其他"
      } as any)
      .eq("user_id", parsed.data.userId)
      .eq("file_id", parsed.data.fileId);

    const { data: f } = await admin
      .from("files")
      .select("id,name,category")
      .eq("id", parsed.data.fileId)
      .maybeSingle();
    const label = f ? `${f.category || ""} ${f.name || ""}`.trim() : parsed.data.fileId;

    await admin.from("notifications").insert({
      to_user_id: parsed.data.userId,
      from_user_id: actor.id,
      title: "文件权限已关�?/ File access revoked",
      content: `你的文件权限已关闭：${label}\n\nYour file access has been revoked: ${label}`
    } as any);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
