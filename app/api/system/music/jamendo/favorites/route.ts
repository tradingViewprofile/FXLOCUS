import { NextRequest, NextResponse } from "next/server";

import {
  getJamendoApiBase,
  getJamendoEnv,
  readTokens,
  refreshAccessToken,
  setTokensCookies
} from "@/lib/music/jamendo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200, res?: NextResponse) {
  const response =
    res ??
    NextResponse.json(payload, {
      status,
      headers: { "Cache-Control": "no-store" }
    });
  return response;
}

export async function GET(req: NextRequest) {
  const { clientId, clientSecret } = getJamendoEnv();
  if (!clientId) return json({ ok: false, error: "JAMENDO_DISABLED" }, 400);

  let tokens = readTokens(req);
  const now = Date.now();
  let refreshed: { accessToken: string; refreshToken?: string | null; expiresIn?: number | null } | null = null;
  if ((!tokens.accessToken || tokens.expiresAt <= now) && tokens.refreshToken && clientSecret) {
    refreshed = await refreshAccessToken(tokens.refreshToken, clientId, clientSecret);
    if (refreshed) {
      tokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || "",
        expiresAt: now + Number(refreshed.expiresIn || 0) * 1000
      };
    } else {
      return json({ ok: false, error: "TOKEN_EXPIRED" }, 401);
    }
  }

  if (!tokens.accessToken) return json({ ok: false, error: "TOKEN_MISSING" }, 401);

  const url = new URL(`${getJamendoApiBase()}/users/tracks/`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("access_token", tokens.accessToken);
  url.searchParams.set("relation", "favorite");
  url.searchParams.set("limit", "50");
  url.searchParams.set("include", "musicinfo+licenses");
  url.searchParams.set("audioformat", "mp31");
  url.searchParams.set("imagesize", "200");

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!res.ok) return json({ ok: false, error: `UPSTREAM_${res.status}` }, 502);
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.results) ? data.results : [];

  const items = rows
    .map((row: any) => {
      const id = String(row?.id || "");
      const name = String(row?.name || "").trim();
      if (!id || !name) return null;
      const license =
        String(
          row?.license ||
            row?.musicinfo?.license ||
            row?.licenses?.[0]?.name ||
            ""
        ).trim() || null;
      const licenseUrl =
        String(
          row?.license_ccurl ||
            row?.license_url ||
            row?.musicinfo?.license_ccurl ||
            row?.musicinfo?.license_url ||
            row?.licenses?.[0]?.url ||
            ""
        ).trim() || null;
      const shareUrl =
        String(row?.shareurl || row?.shorturl || row?.url || "").trim() || null;
      return {
        id: `jamendo:${id}`,
        name,
        artist: String(row?.artist_name || ""),
        album: String(row?.album_name || ""),
        cover: String(row?.image || row?.album_image || ""),
        url: "",
        duration: typeof row?.duration === "number" ? row.duration : null,
        source: "jamendo",
        license,
        licenseUrl,
        shareUrl
      };
    })
    .filter(Boolean);

  const response = json({ ok: true, items });
  if (refreshed) {
    setTokensCookies(response, refreshed);
  }
  return response;
}
