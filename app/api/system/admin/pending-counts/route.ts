import { NextRequest, NextResponse } from "next/server";

import { requireManager } from "@/lib/system/guard";
import { getPendingCounts } from "@/lib/system/pendingCounts";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=60" }
  });
}

export async function GET(_req: NextRequest) {
  try {
    const { user, supabase } = await requireManager();
    const admin = supabaseAdmin();
    const { counts, warnings } = await getPendingCounts({ user, admin });
    return json({ ok: true, counts, warnings });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
