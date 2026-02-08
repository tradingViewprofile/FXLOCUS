import { NextResponse } from "next/server";

import { getDonatePrice } from "@/lib/donate/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getDonatePrice();
    return NextResponse.json(
      { ok: true, ...data },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
          Pragma: "no-cache"
        }
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}
