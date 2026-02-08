import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  items: z.array(z.object({ userId: z.string().uuid() })).min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user: adminUser } = await requireAdmin();
    const admin = supabaseAdmin();
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const now = new Date().toISOString();
    const status = parsed.data.action === "approve" ? "approved" : "rejected";
    const enabled = status === "approved";
    const rejectionReason = status === "rejected" ? String(parsed.data.reason || "Rejected") : null;

    const rows = parsed.data.items.map((it) => ({
      user_id: it.userId,
      enabled,
      status,
      reviewed_at: now,
      reviewed_by: adminUser.id,
      rejection_reason: rejectionReason
    }));

    const up = await admin
      .from("ladder_authorizations")
      .upsert(rows as any, { onConflict: "user_id" });
    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    const notifications = parsed.data.items.map((it) => ({
      to_user_id: it.userId,
      from_user_id: adminUser.id,
      title:
        status === "approved"
          ? "天梯申请已通过 / Ladder approved"
          : "天梯申请被拒�?/ Ladder rejected",
      content:
        status === "approved"
          ? "你的天梯申请已通过，现在可以查看天梯。\n\nYour ladder request has been approved. You can view the ladder now."
          : `你的天梯申请被拒绝。原因：${rejectionReason}\n\nYour ladder request was rejected. Reason: ${rejectionReason}`
    }));

    const ins = await admin.from("notifications").insert(notifications as any);
    if (ins.error) return json({ ok: false, error: "NOTIFY_FAILED" }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

