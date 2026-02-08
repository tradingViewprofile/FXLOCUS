import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { ensureLearningStatus } from "@/lib/system/studentStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  accessId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional()
});

const BodyByUser = z.object({
  userId: z.string().min(1),
  courseId: z.coerce.number().int().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional()
});

const REJECTION_REASONS = ["资料不完整", "不符合要求", "名额已满", "重复申请", "其他"] as const;
type RejectionReason = (typeof REJECTION_REASONS)[number];

function normalizeRejectionReason(input: unknown): RejectionReason {
  const value = String(input || "").trim();
  return (REJECTION_REASONS as readonly string[]).includes(value) ? (value as RejectionReason) : "其他";
}

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let adminUserId = "";
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  let admin = supabaseAdmin();
  try {
    const ctx = await requireAdmin();
    adminUserId = ctx.user.id;
    supabase = ctx.supabase;
    admin = supabaseAdmin();
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  const parsedByUser = BodyByUser.safeParse(raw);
  if (!parsed.success && !parsedByUser.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  const now = new Date().toISOString();

  const notify = async (
    toUserId: string,
    courseId: number,
    status: "approved" | "rejected",
    reason?: string
  ) => {
    const { data: c } = await supabase!
      .from("courses")
      .select("id,title_zh,title_en")
      .eq("id", courseId)
      .maybeSingle();

    const label = `#${courseId} ${c?.title_zh || c?.title_en || ""}`.trim();
    const title =
      status === "approved"
        ? "课程申请已通过 / Course approved"
        : "课程申请被拒绝 / Course rejected";
    const content =
      status === "approved"
        ? `你的课程申请已通过：${label}\n\nYour course request has been approved: ${label}`
        : `你的课程申请被拒绝：${label}\n原因：${reason || "Rejected"}\n\nYour course request was rejected: ${label}\nReason: ${reason || "Rejected"}`;

    const ins = await supabase!.from("notifications").insert({
      to_user_id: toUserId,
      from_user_id: adminUserId,
      title,
      content
    } as any);

    if (ins.error) return ins.error;
    return null;
  };

  if (parsed.success) {
    const { data: row, error: rowErr } = await supabase!
      .from("course_access")
      .select("user_id,course_id")
      .eq("id", parsed.data.accessId)
      .maybeSingle();
    if (rowErr) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
    if (!row) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

    const payload: Record<string, unknown> = {
      reviewed_at: now,
      reviewed_by: adminUserId
    };

    if (parsed.data.action === "approve") {
      payload.status = "approved";
      payload.rejection_reason = null;
    } else {
      payload.status = "rejected";
      payload.rejection_reason = normalizeRejectionReason(parsed.data.rejectionReason);
    }

    const { error } = await supabase!.from("course_access").update(payload).eq("id", parsed.data.accessId);
    if (error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);

    if (payload.status === "approved") {
      await ensureLearningStatus(admin, String(row.user_id));
    }

    const nerr = await notify(
      String(row.user_id),
      Number(row.course_id),
      (payload.status as any) === "approved" ? "approved" : "rejected",
      String(payload.rejection_reason || "")
    );
    if (nerr) return noStoreJson({ ok: false, error: "NOTIFY_FAILED" }, 500);
    return noStoreJson({ ok: true });
  }

  if (!parsedByUser.success) {
    return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);
  }

  const status = parsedByUser.data.action === "approve" ? "approved" : "rejected";
  const reason = normalizeRejectionReason(parsedByUser.data.reason);

  const { data: existing, error: existErr } = await supabase!
    .from("course_access")
    .select("id")
    .eq("user_id", parsedByUser.data.userId)
    .eq("course_id", parsedByUser.data.courseId)
    .maybeSingle();

  if (existErr) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);

  if (!existing?.id) {
    const ins = await supabase!.from("course_access").insert({
      user_id: parsedByUser.data.userId,
      course_id: parsedByUser.data.courseId,
      status,
      reviewed_at: now,
      reviewed_by: adminUserId,
      rejection_reason: status === "rejected" ? reason : null
    } as any);
    if (ins.error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
    if (status === "approved") {
      await ensureLearningStatus(admin, parsedByUser.data.userId);
    }
    const nerr = await notify(parsedByUser.data.userId, parsedByUser.data.courseId, status as any, reason);
    if (nerr) return noStoreJson({ ok: false, error: "NOTIFY_FAILED" }, 500);
    return noStoreJson({ ok: true });
  }

  const upd = await supabase!
    .from("course_access")
    .update({
      status,
      reviewed_at: now,
      reviewed_by: adminUserId,
      rejection_reason: status === "rejected" ? reason : null
    })
    .eq("id", existing.id);

  if (upd.error) return noStoreJson({ ok: false, error: "DB_ERROR" }, 500);
  if (status === "approved") {
    await ensureLearningStatus(admin, parsedByUser.data.userId);
  }

  const nerr = await notify(parsedByUser.data.userId, parsedByUser.data.courseId, status as any, reason);
  if (nerr) return noStoreJson({ ok: false, error: "NOTIFY_FAILED" }, 500);
  return noStoreJson({ ok: true });
}
