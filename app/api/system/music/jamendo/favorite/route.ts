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

export async function POST(req: NextRequest) {
  const { clientId, clientSecret } = getJamendoEnv();
  if (!clientId) return json({ ok: false, error: "JAMENDO_DISABLED" }, 400);

  const body = await req.json().catch(() => null);
  const rawTrackId = String(body?.trackId || "").trim();
  if (!rawTrackId) return json({ ok: false, error: "INVALID_TRACK" }, 400);
  const trackId = rawTrackId.replace(/^jamendo:/, "").trim();
  if (!trackId) return json({ ok: false, error: "INVALID_TRACK" }, 400);

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

  const url = new URL(`${getJamendoApiBase()}/setuser/favorite/`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("access_token", tokens.accessToken);
  url.searchParams.set("track_id", trackId);

  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!res.ok) return json({ ok: false, error: `UPSTREAM_${res.status}` }, 502);
  const data = await res.json().catch(() => null);

  const response = json({ ok: true, result: data }, 200);
  if (refreshed) {
    setTokensCookies(response, refreshed);
  }
  return response;
}

