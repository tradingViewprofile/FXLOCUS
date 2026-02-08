import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const secret = String(process.env.REVALIDATE_SECRET || "").trim();
  if (!secret) return json({ ok: false, error: "MISSING_REVALIDATE_SECRET" }, 500);

  const headerSecret = req.headers.get("x-revalidate-secret");
  const urlSecret = req.nextUrl.searchParams.get("secret");
  const provided = String(headerSecret || urlSecret || "").trim();
  if (!provided || provided !== secret) return json({ ok: false, error: "UNAUTHORIZED" }, 401);

  const body = (await req.json().catch(() => null)) as any;
  const pathsRaw = body?.paths ?? body?.path;
  const tagsRaw = body?.tags ?? body?.tag;

  const paths = (Array.isArray(pathsRaw) ? pathsRaw : pathsRaw ? [pathsRaw] : [])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  const tags = (Array.isArray(tagsRaw) ? tagsRaw : tagsRaw ? [tagsRaw] : [])
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  if (!paths.length && !tags.length) {
    return json({ ok: false, error: "MISSING_PATH_OR_TAG" }, 400);
  }

  try {
    paths.forEach((p) => revalidatePath(p));
    tags.forEach((t) => revalidateTag(t));
    return json({ ok: true, paths, tags });
  } catch (e: any) {
    return json({ ok: false, error: "REVALIDATE_FAILED", message: e?.message || String(e) }, 500);
  }
}

