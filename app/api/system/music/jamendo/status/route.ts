import { NextRequest, NextResponse } from "next/server";

import {
  clearTokensCookies,
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

  const tokens = readTokens(req);
  const now = Date.now();
  const hasAccess = Boolean(tokens.accessToken);
  const isExpired = tokens.expiresAt && tokens.expiresAt <= now + 30_000;

  if (!hasAccess && !tokens.refreshToken) {
    return json({ ok: true, connected: false });
  }

  if (isExpired && (!tokens.refreshToken || !clientSecret)) {
    const res = NextResponse.json({ ok: true, connected: false }, { status: 200 });
    clearTokensCookies(res);
    return res;
  }

  if (isExpired && tokens.refreshToken && clientSecret) {
    const refreshed = await refreshAccessToken(tokens.refreshToken, clientId, clientSecret);
    if (!refreshed) {
      const res = NextResponse.json({ ok: true, connected: false }, { status: 200 });
      clearTokensCookies(res);
      return res;
    }
    const res = NextResponse.json(
      { ok: true, connected: true, expiresAt: Date.now() + refreshed.expiresIn * 1000 },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
    setTokensCookies(res, refreshed);
    return res;
  }

  if (!tokens.accessToken) {
    return json({ ok: true, connected: false });
  }

  return json({ ok: true, connected: true, expiresAt: tokens.expiresAt || null });
}
