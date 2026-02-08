import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";

export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const { user } = await requireSystemUser();
    return json({ ok: true, user });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

