import { NextRequest, NextResponse } from "next/server";
import { r2Enabled, r2PresignGet } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const desktopPrefix = process.env.R2_DESKTOP_PREFIX || "desktop";
const cdnBaseRaw =
  process.env.R2_CDN_BASE_URL ||
  process.env.R2_PUBLIC_BASE_URL ||
  "https://cdn.fxlocus.com";
const cdnBase = cdnBaseRaw
  ? cdnBaseRaw.startsWith("http://") || cdnBaseRaw.startsWith("https://")
    ? cdnBaseRaw
    : `https://${cdnBaseRaw}`
  : "";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function buildPublicUrl(key: string) {
  if (!cdnBase) return "";
  return `${cdnBase.replace(/\/+$/, "")}/${String(key || "").replace(/^\/+/, "")}`;
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("json") === "1";
  const prefix = desktopPrefix.replace(/\/+$/, "");
  const metaKey = `${prefix}/desktop-package.json`;
  const exeKey = `${prefix}/fxlocus_setup.exe`;
  try {
    const metaUrl = buildPublicUrl(metaKey);
    const metaRes = metaUrl ? await fetch(metaUrl, { cache: "no-store" }) : null;
    const meta = metaRes && metaRes.ok ? await metaRes.json().catch(() => null) : null;

    const version = String(meta?.version || "");
    const builtAt = String(meta?.builtAt || "") || null;
    const downloadUrl = String(meta?.downloadUrl || buildPublicUrl(exeKey));

    if (wantsJson) {
      return json({
        ok: true,
        version,
        builtAt,
        downloadUrl,
        metaUrl
      });
    }

    if (downloadUrl) {
      return NextResponse.redirect(downloadUrl, 302);
    }

    if (r2Enabled()) {
      const signed = await r2PresignGet(exeKey, 3600);
      return NextResponse.redirect(signed, 302);
    }

    return json({ ok: false, error: "NO_INSTALLER" }, 404);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "FETCH_FAILED" }, 500);
  }
}
