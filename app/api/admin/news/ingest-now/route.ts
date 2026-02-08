import { NextRequest, NextResponse } from "next/server";

import { ingestOnce } from "@/lib/news/ingest";
import { acquireJobLock, releaseJobLock } from "@/lib/system/jobLock";

export const runtime = "nodejs";

const JOB_NAME = "cron_news_ingest";
const LOCK_SECONDS = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.NEWS_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const lock = await acquireJobLock(JOB_NAME, LOCK_SECONDS);
  if (!lock.ok) {
    return NextResponse.json({ ok: false, error: lock.error }, { status: 202 });
  }

  try {
    const result = await ingestOnce();
    await releaseJobLock(JOB_NAME);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    await releaseJobLock(JOB_NAME, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
