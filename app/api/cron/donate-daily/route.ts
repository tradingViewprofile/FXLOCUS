import { NextRequest, NextResponse } from "next/server";

import { getDonatePrice } from "@/lib/donate/pricing";
import { acquireJobLock, releaseJobLock } from "@/lib/system/jobLock";

export const runtime = "nodejs";

const JOB_NAME = "cron_donate_daily";
const LOCK_SECONDS = 300;

async function handle(req: NextRequest, secret: string | null) {
  const configuredSecret = process.env.DONATE_CRON_SECRET;
  if (configuredSecret) {
    if (!secret || secret !== configuredSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const lock = await acquireJobLock(JOB_NAME, LOCK_SECONDS);
  if (!lock.ok) {
    return NextResponse.json({ ok: false, error: lock.error }, { status: 202 });
  }

  try {
    const data = await getDonatePrice();
    await releaseJobLock(JOB_NAME);
    return NextResponse.json({ ok: true, ...data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseJobLock(JOB_NAME, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  return handle(req, secret);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return handle(req, secret);
}
