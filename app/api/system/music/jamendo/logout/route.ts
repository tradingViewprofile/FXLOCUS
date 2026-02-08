import { NextResponse } from "next/server";

import { clearTokensCookies } from "@/lib/music/jamendo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
  clearTokensCookies(res);
  return res;
}
