import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchAssistantCreatedUserIds } from "@/lib/system/assistantAssignments";
import { requireSystemUser } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  items: z
    .array(
      z.object({
        userId: z.string().uuid(),
        fileId: z.string().uuid()
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
    const { user } = await requireSystemUser();
    if (!(user.role === "super_admin" || user.role === "leader" || user.role === "assistant")) {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const admin = supabaseAdmin();
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const now = new Date().toISOString();
    const status = parsed.data.action === "approve" ? "approved" : "rejected";
    const rejectionReason = status === "rejected" ? normalizeRejectionReason(parsed.data.reason) : null;

    const unique = new Map<string, { userId: string; fileId: string }>();
    for (const it of parsed.data.items) unique.set(`${it.userId}:${it.fileId}`, it);
    const items = Array.from(unique.values());

    const scopeIds =
      user.role === "leader"
        ? await fetchLeaderTreeIds(admin, user.id)
        : user.role === "assistant"
          ? await fetchAssistantCreatedUserIds(admin, user.id)
          : null;
    if (scopeIds) {
      const scopeSet = new Set<string>((scopeIds || []).map(String).filter(Boolean));
      const outOfScope = items.filter((it: { userId: string }) => !scopeSet.has(it.userId));
      if (outOfScope.length) return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    if (status === "approved") {
      const perms = items.map((it) => ({
        file_id: it.fileId,
        grantee_profile_id: it.userId,
        granted_by: user.id
      }));
      const up = await admin
        .from("file_permissions")
        .upsert(perms as any, { onConflict: "file_id,grantee_profile_id", ignoreDuplicates: true });
      if (up.error) return json({ ok: false, error: up.error.message }, 500);
    }

    const updates = await Promise.all(
      items.map((it) =>
        admin
          .from("file_access_requests")
          .update({
            status,
            reviewed_at: now,
            reviewed_by: user.id,
            rejection_reason: rejectionReason
          } as any)
          .eq("user_id", it.userId)
          .eq("file_id", it.fileId)
      )
    );
    for (const u of updates) {
      if (u.error) return json({ ok: false, error: u.error.message }, 500);
    }

    const fileIds = Array.from(new Set<string>(items.map((it) => it.fileId)));
    const { data: filesRaw, error: fileErr } = fileIds.length
      ? await admin.from("files").select("id,name,category").in("id", fileIds)
      : { data: [], error: null };
    if (fileErr) return json({ ok: false, error: fileErr.message }, 500);
    type FileRow = { id: string; name: string | null; category: string | null };
    const files = (Array.isArray(filesRaw) ? filesRaw : []) as FileRow[];
    const fileById = new Map<string, FileRow>(files.map((f) => [String(f.id), f]));

    const notifications = items.map((it) => {
      const f = fileById.get(it.fileId);
      const label = f ? `${f.category || ""} ${f.name || ""}`.trim() : it.fileId;
      return {
        to_user_id: it.userId,
        from_user_id: user.id,
        title:
          status === "approved"
            ? "文件权限已通过 / File access approved"
            : "文件权限已拒绝 / File access rejected",
        content:
          status === "approved"
            ? `你的文件权限申请已通过：${label}\n\nYour file access request has been approved: ${label}`
            : `你的文件权限申请被拒绝：${label}\n原因：${rejectionReason}\n\nYour file access request was rejected: ${label}\nReason: ${rejectionReason}`
      };
    });

    const ins = await admin.from("notifications").insert(notifications as any);
    if (ins.error) return json({ ok: false, error: "NOTIFY_FAILED" }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
