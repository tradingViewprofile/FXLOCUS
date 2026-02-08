import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireAdmin } from "@/lib/system/guard";
import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  password: z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().min(1).max(64))
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();
    if (user.role !== "leader" && user.role !== "super_admin") {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() }, 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const fullName = parsed.data.fullName.trim();
    const phoneRaw = parsed.data.phone.trim();
    const phone = phoneRaw.replace(/[\s-]/g, "");
    if (!phone || !PHONE_REGEX.test(phone)) {
      return json({ ok: false, error: "INVALID_PHONE" }, 400);
    }
    if (!isStrongSystemPassword(parsed.data.password)) {
      return json({ ok: false, error: "WEAK_PASSWORD" }, 400);
    }

    const admin = supabaseAdmin();

    const existing = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing.data?.id) {
      return json({ ok: false, error: "EMAIL_EXISTS" }, 409);
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const ownerId = user.id;
    const upsert = await admin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: "assistant",
        leader_id: ownerId,
        created_by: ownerId,
        status: "active",
        password_hash: passwordHash,
        created_at: now,
        updated_at: now
      } as any,
      { onConflict: "id" }
    );

    if (upsert.error) {
      return json({ ok: false, error: upsert.error.message }, 500);
    }

    const { data: courses, error: coursesErr } = await admin
      .from("courses")
      .select("id")
      .is("deleted_at", null)
      .order("id", { ascending: true });
    if (coursesErr) {
      return json({ ok: false, error: coursesErr.message }, 500);
    }

    const courseIds = (courses || [])
      .map((course: { id: number | string | null }) => Number(course.id))
      .filter((courseId: number) => Number.isFinite(courseId));
    if (courseIds.length) {
      const courseUpsert = await admin.from("course_access").upsert(
        courseIds.map((courseId: number) => ({
          user_id: userId,
          course_id: courseId,
          status: "approved",
          requested_at: now,
          reviewed_at: now,
          reviewed_by: ownerId,
          updated_at: now
        })),
        { onConflict: "user_id,course_id" }
      );
      if (courseUpsert.error) {
        return json({ ok: false, error: courseUpsert.error.message }, 500);
      }
    }

    return json({ ok: true, id: userId });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
