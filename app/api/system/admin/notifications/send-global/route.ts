import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().min(1).max(80),
  content: z.string().min(1).max(2000)
});

const ALLOWED_ROLES = ["student", "trader", "coach", "leader"] as const;

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await requireAdmin();
    const raw = await req.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const admin = supabaseAdmin();

    let targetIds: string[] | null = null;
    if (user.role === "leader") {
      const treeIds = await fetchLeaderTreeIds(supabase, user.id);
      targetIds = (treeIds || []).map(String).filter((id: string) => id && id !== user.id);
      if (!targetIds.length) return json({ ok: true, sent: 0 });
    }

    let query = admin
      .from("profiles")
      .select("id,role")
      .in("role", ALLOWED_ROLES)
      .limit(5000);

    if (targetIds) {
      query = query.in("id", targetIds);
    }

    const { data: profiles, error } = await query;
    if (error) return json({ ok: false, error: error.message }, 500);

    const ids = (profiles || [])
      .map((row: { id: string | null }) => String(row.id || ""))
      .filter(Boolean) as string[];
    if (!ids.length) return json({ ok: true, sent: 0 });

    const rows = ids.map((id: string) => ({
      to_user_id: id,
      from_user_id: user.id,
      title: parsed.data.title,
      content: parsed.data.content
    }));

    const ins = await supabase.from("notifications").insert(rows);
    if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

    return json({ ok: true, sent: rows.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
