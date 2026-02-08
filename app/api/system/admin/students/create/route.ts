import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireManager } from "@/lib/system/guard";
import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { ensureLearningStatus } from "@/lib/system/studentStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trimToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lowered = trimmed.toLowerCase();
  if (["null", "undefined", "none", "nil", "n/a", "na", "-"].includes(lowered)) return undefined;
  return trimmed;
};

const Email = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .min(3)
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
);

const PHONE_REGEX = /^\+?[0-9]{6,20}$/;

const Body = z.object({
  fullName: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(120)
  ),
  email: Email,
  phone: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(40)
  ),
  initialPassword: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().min(1).max(64)),
  defaultOpenCourses: z.coerce.number().int().min(0).max(21).optional().default(0),
  leaderId: z.preprocess(trimToUndefined, z.string().uuid().optional()),
  source: z.preprocess(trimToUndefined, z.string().max(40).optional())
});

function normalizeSource(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "boss") return "boss";
  if (raw === "商业�? || lower === "commercial") return "商业�?;
  if (raw === "其他渠道" || raw === "其他" || lower === "other") return "其他渠道";
  return null;
}

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

async function readBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const data: Record<string, string> = {};
    form.forEach((value, key) => {
      data[key] = typeof value === "string" ? value : value.name;
    });
    return data;
  }

  const text = await req.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    if (!Array.from(params.keys()).length) return null;
    const data: Record<string, string> = {};
    params.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }
}

function normalizeBody(input: Record<string, unknown> | null) {
  const data = (input || {}) as Record<string, unknown>;
  return {
    fullName: data.fullName ?? data.full_name ?? data.name ?? data.username,
    email: data.email ?? data.userEmail ?? data.mail,
    phone: data.phone ?? data.phone_number ?? data.mobile,
    initialPassword: data.initialPassword ?? data.initial_password ?? data.password ?? data.pass,
    defaultOpenCourses: data.defaultOpenCourses ?? data.default_open_courses ?? data.openCourses,
    leaderId: data.leaderId ?? data.leader_id ?? data.team_leader_id,
    source: data.source ?? data.origin ?? data.channel
  };
}

export async function POST(req: NextRequest) {
  let actorId = "";
  let actorRole: "leader" | "super_admin" | "assistant" = "leader";
  let actorLeaderId: string | null = null;
  try {
    const ctx = await requireManager();
    if (ctx.user.role === "coach") {
      return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
    }
    actorId = ctx.user.id;
    actorRole =
      ctx.user.role === "super_admin"
        ? "super_admin"
        : ctx.user.role === "assistant"
          ? "assistant"
          : "leader";
    actorLeaderId = ctx.user.leader_id ?? null;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const parsed = Body.safeParse(normalizeBody(await readBody(req)));
  if (!parsed.success) {
    return noStoreJson({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() }, 400);
  }
  if (!isStrongSystemPassword(parsed.data.initialPassword)) {
    return noStoreJson({ ok: false, error: "WEAK_PASSWORD" }, 400);
  }

  const admin = supabaseAdmin();
  const now = new Date().toISOString();

  const fullName = parsed.data.fullName.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const phoneRaw = typeof parsed.data.phone === "string" ? parsed.data.phone.trim() : "";
  const phone = phoneRaw.replace(/[\s-]/g, "");
  if (!phone) {
    return noStoreJson({ ok: false, error: "PHONE_REQUIRED" }, 400);
  }
  if (!PHONE_REGEX.test(phone)) {
    return noStoreJson({ ok: false, error: "INVALID_PHONE" }, 400);
  }

  const leaderIdRaw = typeof parsed.data.leaderId === "string" ? parsed.data.leaderId.trim() : "";
  let leaderId: string | null = null;
  if (actorRole === "leader") {
    leaderId = actorId;
  } else if (actorRole === "assistant") {
    if (!actorLeaderId) return noStoreJson({ ok: false, error: "MISSING_LEADER" }, 400);
    leaderId = actorLeaderId;
  } else {
    leaderId = leaderIdRaw ? leaderIdRaw : actorId;
    if (leaderIdRaw) {
      const { data: leader } = await admin.from("profiles").select("id,role").eq("id", leaderId).maybeSingle();
      if (!leader?.id || leader.role !== "leader") {
        return noStoreJson({ ok: false, error: "INVALID_LEADER" }, 400);
      }
    }
  }

  const existing = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing.data?.id) {
    return noStoreJson({ ok: false, error: "EMAIL_EXISTS" }, 409);
  }

  const createdUserId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(parsed.data.initialPassword, 12);
  const createdBy = actorRole === "assistant" ? actorId : null;

  const normalizedSource = normalizeSource(parsed.data.source ?? null);
  const forceZeroCourses = normalizedSource === "商业�? || normalizedSource === "其他渠道";

  const profileUpsert = await admin.from("profiles").upsert(
    {
      id: createdUserId,
      email,
      full_name: fullName,
      phone: phone || null,
      role: "student",
      leader_id: leaderId,
      created_by: createdBy,
      source: normalizedSource,
      student_status: "普通学�?,
      status: "active",
      password_hash: passwordHash,
      created_at: now,
      updated_at: now
    } as any,
    { onConflict: "id" }
  );

  if (profileUpsert.error) {
    return noStoreJson({ ok: false, error: profileUpsert.error.message }, 500);
  }

  const defaultOpenCourses = forceZeroCourses
    ? 0
    : actorRole === "assistant"
      ? 1
      : parsed.data.defaultOpenCourses;

  if (defaultOpenCourses > 0) {
    const courseIds = Array.from({ length: defaultOpenCourses }).map((_, i) => i + 1);
    await admin.from("course_access").upsert(
      courseIds.map((courseId) => ({
        user_id: createdUserId,
        course_id: courseId,
        status: "approved",
        requested_at: now,
        reviewed_at: now,
        reviewed_by: actorId,
        updated_at: now
      })),
      { onConflict: "user_id,course_id" }
    );
  }

  if (defaultOpenCourses >= 2) {
    await ensureLearningStatus(admin, createdUserId);
  }

  return noStoreJson({ ok: true, id: createdUserId });
}
