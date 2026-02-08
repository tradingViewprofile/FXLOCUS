import { NextResponse } from "next/server";

import { listConsultRecipients } from "@/lib/system/consult";
import { requireSystemUser } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
  });
}

export async function GET() {
  try {
    const ctx = await requireSystemUser();
    const items = await listConsultRecipients(ctx);
    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
