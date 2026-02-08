import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

const EQUITY_CURVE_DIR = path.join(process.cwd(), "public", "EquityCurve");

export async function GET() {
  try {
    const fileNames = await fs.readdir(EQUITY_CURVE_DIR);
    const metas = await Promise.all(
      fileNames
        // Return source images only. WebP variants are served via <picture>.
        .filter((fileName) => /\.(png|jpe?g)$/i.test(fileName))
        .map(async (fileName) => {
          const stat = await fs.stat(path.join(EQUITY_CURVE_DIR, fileName));
          return { fileName, mtimeMs: stat.mtimeMs };
        })
    );
    metas.sort((a, b) => a.mtimeMs - b.mtimeMs || a.fileName.localeCompare(b.fileName));
    return json({ ok: true, items: metas });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "LIST_FAILED" }, 500);
  }
}

