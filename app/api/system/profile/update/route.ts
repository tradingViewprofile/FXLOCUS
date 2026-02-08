import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireSystemUser } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  phone: z.string().max(40).optional()
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let userId = "";
  let supabase: Awaited<ReturnType<typeof requireSystemUser>>["supabase"];
  try {
    const ctx = await requireSystemUser();
    userId = ctx.user.id;
    supabase = ctx.supabase;
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ ok: false, error: "INVALID_BODY" }, 400);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const phone = typeof parsed.data.phone === "string" ? parsed.data.phone.trim() : "";

  if (parsed.data.phone !== undefined) {
    if (phone) {
      if (phone.length < 3) return noStoreJson({ ok: false, error: "INVALID_PHONE" }, 400);
      payload.phone = phone;
    } else {
      payload.phone = null;
    }
  }

  const { error } = await supabase!.from("profiles").update(payload).eq("id", userId);
  if (error) return noStoreJson({ ok: false, error: error.message }, 500);
  return noStoreJson({ ok: true });
}
