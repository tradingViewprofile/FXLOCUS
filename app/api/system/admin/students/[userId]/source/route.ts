import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SourceParam = z.enum(["boss", "商业�?, "其他渠道"]);
const Body = z.object({
  source: SourceParam.optional().nullable()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, ctx: { params: { userId: string } }) {
  try {
    const { supabase } = await requireAdmin();
    const userId = String(ctx.params.userId || "");
    if (!userId) return json({ ok: false, error: "INVALID_USER" }, 400);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const source = parsed.data.source ?? null;
    const up = await supabase
      .from("profiles")
      .update({ source, updated_at: new Date().toISOString() } as any)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (up.error) return json({ ok: false, error: up.error.message }, 500);
    if (!up.data?.id) return json({ ok: false, error: "NOT_FOUND" }, 404);
    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
