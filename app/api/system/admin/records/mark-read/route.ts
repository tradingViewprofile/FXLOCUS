import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().uuid()
});

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const admin = supabaseAdmin();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ ok: false, error: "INVALID_BODY" }, 400);

    const now = new Date().toISOString();
    const { error } = await admin
      .from("records")
      .update({ read_at: now })
      .eq("id", parsed.data.id);
    if (error) {
      const { data: row, error: rowErr } = await admin
        .from("records")
        .select("payload,content")
        .eq("id", parsed.data.id)
        .maybeSingle();
      if (rowErr) return json({ ok: false, error: rowErr.message }, 200);
      let payload: Record<string, unknown> = {};
      if (row?.payload && typeof row.payload === "object") {
        payload = { ...(row.payload as Record<string, unknown>) };
      } else if (typeof row?.content === "string") {
        try {
          const parsedContent = JSON.parse(row.content) as Record<string, unknown>;
          if (parsedContent && typeof parsedContent === "object") payload = { ...parsedContent };
        } catch {
          payload = {};
        }
      }
      payload.read_at = now;
      const { error: updateErr } = await admin
        .from("records")
        .update({ payload })
        .eq("id", parsed.data.id);
      if (!updateErr) return json({ ok: true, fallback: "payload" });

      if (typeof row?.content === "string") {
        try {
          const parsedContent = JSON.parse(row.content);
          if (parsedContent && typeof parsedContent === "object") {
            (parsedContent as any).read_at = now;
            const { error: contentErr } = await admin
              .from("records")
              .update({ content: JSON.stringify(parsedContent) })
              .eq("id", parsed.data.id);
            if (!contentErr) return json({ ok: true, fallback: "content" });
          }
        } catch {
          // ignore
        }
      }

      return json({ ok: false, error: updateErr?.message || error.message }, 200);
    }

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
