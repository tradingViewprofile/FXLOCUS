import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { acquireJobLock, releaseJobLock } from "@/lib/system/jobLock";
import { removeStoredObjects } from "@/lib/storage/storage";

export const runtime = "nodejs";

const JOB_NAME = "cron_consult_retention";
const LOCK_SECONDS = 900;

async function cleanupConsult() {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  let removedFiles = 0;
  let loops = 0;

  while (loops < 20) {
    loops += 1;
    const { data: rows, error } = await admin
      .from("consult_messages")
      .select("id,image_bucket,image_path")
      .lt("created_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!rows?.length) break;

    const stored = rows
      .filter((row: any) => row?.image_bucket && row?.image_path)
      .map((row: any) => ({ bucket: row.image_bucket as string, path: row.image_path as string }));
    if (stored.length) {
      await removeStoredObjects(admin, stored);
      removedFiles += stored.length;
    }

    const ids = rows.map((row: any) => row.id);
    const del = await admin.from("consult_messages").delete().in("id", ids);
    if (del.error) throw new Error(del.error.message);
    deleted += ids.length;

    if (rows.length < 200) break;
  }

  return { deleted, removedFiles, cutoff };
}

async function handle(req: NextRequest, secret: string | null) {
  const configuredSecret = process.env.CONSULT_RETENTION_SECRET;
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
    const result = await cleanupConsult();
    await releaseJobLock(JOB_NAME);
    return NextResponse.json({ ok: true, result }, { status: 200 });
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
