import { NextResponse } from "next/server";
import { z } from "zod";

import { requireManager } from "@/lib/system/guard";
import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { fetchCoachAssignedUserSet } from "@/lib/system/coachAssignments";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { ensureLearningStatus } from "@/lib/system/studentStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  items: z
    .array(
        z.object({
          userId: z.string().uuid(),
          courseId: z.coerce.number().int().min(1)
        })
    )
    .min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional()
});

const REJECTION_REASONS = ["资料不完整", "不符合要求", "名额已满", "重复申请", "其他"] as const;
type RejectionReason = (typeof REJECTION_REASONS)[number];

function normalizeRejectionReason(input: unknown): RejectionReason {
  const value = String(input || "").trim();
  return (REJECTION_REASONS as readonly string[]).includes(value) ? (value as RejectionReason) : "其他";
}

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user: adminUser, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const db = adminUser.role === "coach" || adminUser.role === "assistant" ? admin : supabase;
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    if (adminUser.role === "coach") {
      const assignedSet = await fetchCoachAssignedUserSet(supabase, adminUser.id);
      const invalid = parsed.data.items.find((it) => !assignedSet.has(it.userId));
      if (invalid) return json({ ok: false, error: "FORBIDDEN" }, 403);
    } else if (adminUser.role === "assistant") {
      const createdIds = await fetchAssistantCreatedUserIds(admin, adminUser.id);
      const createdSet = new Set(createdIds);
      const invalid = parsed.data.items.find((it) => !createdSet.has(it.userId));
      if (invalid) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const now = new Date().toISOString();
    const status = parsed.data.action === "approve" ? "approved" : "rejected";
    const rejectionReason = status === "rejected" ? normalizeRejectionReason(parsed.data.reason) : null;

    const rows = parsed.data.items.map((it) => ({
      user_id: it.userId,
      course_id: it.courseId,
      status,
      reviewed_at: now,
      reviewed_by: adminUser.id,
      rejection_reason: rejectionReason
    }));

    const up = await db.from("course_access").upsert(rows as any, { onConflict: "user_id,course_id" });
    if (up.error) return json({ ok: false, error: up.error.message }, 500);

    if (status === "approved") {
      const userIds = Array.from(new Set<string>(parsed.data.items.map((it) => it.userId)));
      await Promise.all(userIds.map((userId: string) => ensureLearningStatus(admin, userId)));
    }

    const courseIds = Array.from(new Set<number>(parsed.data.items.map((it) => it.courseId)));

    type CourseRow = { id: number; title_zh: string | null; title_en: string | null };
    const { data: coursesRaw, error: courseErr } = courseIds.length
      ? await db.from("courses").select("id,title_zh,title_en").in("id", courseIds)
      : { data: [], error: null };
    if (courseErr) return json({ ok: false, error: courseErr.message }, 500);

    const courses = (Array.isArray(coursesRaw) ? coursesRaw : []) as CourseRow[];
    const courseById = new Map<number, CourseRow>(courses.map((c) => [Number(c.id), c]));
    const notifications = parsed.data.items.map((it) => {
      const c = courseById.get(it.courseId);
      const label = `#${it.courseId} ${c?.title_zh || c?.title_en || ""}`.trim();
      const title =
        status === "approved"
          ? "课程申请已通过 / Course approved"
          : "课程申请被拒绝 / Course rejected";
      const content =
        status === "approved"
          ? `你的课程申请已通过：${label}\n\nYour course request has been approved: ${label}`
          : `你的课程申请被拒绝：${label}\n原因：${rejectionReason}\n\nYour course request was rejected: ${label}\nReason: ${rejectionReason}`;

      return {
        to_user_id: it.userId,
        from_user_id: adminUser.id,
        title,
        content
      };
    });

    const ins = await db.from("notifications").insert(notifications as any);
    if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
