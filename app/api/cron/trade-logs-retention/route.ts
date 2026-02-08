import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { acquireJobLock, releaseJobLock } from "@/lib/system/jobLock";
import { removeStoredObjects } from "@/lib/storage/storage";

export const runtime = "nodejs";

const JOB_NAME = "cron_trade_logs_retention";
const LOCK_SECONDS = 900;

async function cleanupTradeLogs(days = 20) {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  let removedFiles = 0;
  let loops = 0;

  while (loops < 20) {
    loops += 1;
    const { data: submissions, error } = await admin
      .from("trade_submissions")
      .select("id")
      .eq("type", "trade_log")
      .lt("created_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!submissions?.length) break;

    const ids = submissions.map((row: any) => row.id);
    const { data: files } = await admin
      .from("trade_submission_files")
      .select("storage_bucket,storage_path")
      .in("submission_id", ids);

    const stored = (files || [])
      .filter((file: any) => file?.storage_bucket && file?.storage_path)
      .map((file: any) => ({ bucket: file.storage_bucket as string, path: file.storage_path as string }));
    if (stored.length) {
      await removeStoredObjects(admin, stored);
      removedFiles += stored.length;
    }

    const del = await admin.from("trade_submissions").delete().in("id", ids);
    if (del.error) throw new Error(del.error.message);
    deleted += ids.length;

    if (submissions.length < 200) break;
  }

  return { deleted, removedFiles, cutoff };
}

async function cleanupTradeStrategies(days = 30) {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  let removedFiles = 0;
  let loops = 0;

  while (loops < 20) {
    loops += 1;
    const { data: submissions, error } = await admin
      .from("trade_submissions")
      .select("id")
      .eq("type", "trade_strategy")
      .is("archived_at", null)
      .lt("created_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!submissions?.length) break;

    const ids = submissions.map((row: any) => row.id);
    const { data: files } = await admin
      .from("trade_submission_files")
      .select("storage_bucket,storage_path")
      .in("submission_id", ids);

    const stored = (files || [])
      .filter((file: any) => file?.storage_bucket && file?.storage_path)
      .map((file: any) => ({ bucket: file.storage_bucket as string, path: file.storage_path as string }));
    if (stored.length) {
      await removeStoredObjects(admin, stored);
      removedFiles += stored.length;
    }

    const del = await admin.from("trade_submissions").delete().in("id", ids);
    if (del.error) throw new Error(del.error.message);
    deleted += ids.length;

    if (submissions.length < 200) break;
  }

  return { deleted, removedFiles, cutoff };
}

async function cleanupWeeklySummaries(days = 30) {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  let removedFiles = 0;
  let loops = 0;

  while (loops < 20) {
    loops += 1;
    const { data: rows, error } = await admin
      .from("weekly_summaries")
      .select(
        "id,strategy_bucket,strategy_path,curve_bucket,curve_path,stats_bucket,stats_path"
      )
      .lt("created_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!rows?.length) break;

    const stored = (rows || [])
      .flatMap((row: any) => [
        row?.strategy_bucket && row?.strategy_path
          ? { bucket: String(row.strategy_bucket), path: String(row.strategy_path) }
          : null,
        row?.curve_bucket && row?.curve_path
          ? { bucket: String(row.curve_bucket), path: String(row.curve_path) }
          : null,
        row?.stats_bucket && row?.stats_path
          ? { bucket: String(row.stats_bucket), path: String(row.stats_path) }
          : null
      ])
      .filter(Boolean) as Array<{ bucket: string; path: string }>;

    if (stored.length) {
      await removeStoredObjects(admin, stored);
      removedFiles += stored.length;
    }

    const ids = rows.map((row: any) => row.id);
    const del = await admin.from("weekly_summaries").delete().in("id", ids);
    if (del.error) throw new Error(del.error.message);
    deleted += ids.length;

    if (rows.length < 200) break;
  }

  return { deleted, removedFiles, cutoff };
}

async function cleanupClassicTrades(days = 30) {
  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  let removedFiles = 0;
  let loops = 0;

  while (loops < 20) {
    loops += 1;
    const { data: rows, error } = await admin
      .from("classic_trades")
      .select("id,image_bucket,image_path")
      .lt("created_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);
    if (!rows?.length) break;

    const stored = (rows || [])
      .filter((row: any) => row?.image_bucket && row?.image_path)
      .map((row: any) => ({ bucket: String(row.image_bucket), path: String(row.image_path) }));
    if (stored.length) {
      await removeStoredObjects(admin, stored);
      removedFiles += stored.length;
    }

    const ids = rows.map((row: any) => row.id);
    const del = await admin.from("classic_trades").delete().in("id", ids);
    if (del.error) throw new Error(del.error.message);
    deleted += ids.length;

    if (rows.length < 200) break;
  }

  return { deleted, removedFiles, cutoff };
}

async function handle(req: NextRequest, secret: string | null) {
  const configuredSecret = process.env.TRADE_LOG_RETENTION_SECRET;
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
    const [tradeLogs, tradeStrategies, weeklySummaries, classicTrades] = await Promise.all([
      cleanupTradeLogs(20),
      cleanupTradeStrategies(30),
      cleanupWeeklySummaries(30),
      cleanupClassicTrades(30)
    ]);
    const result = { tradeLogs, tradeStrategies, weeklySummaries, classicTrades };
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
