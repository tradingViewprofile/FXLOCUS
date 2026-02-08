import { NextRequest, NextResponse } from "next/server";

import {
  getJamendoAuthorizeUrl,
  getJamendoEnv,
  getOAuthRedirectUrl,
  setOauthStateCookie
} from "@/lib/music/jamendo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { clientId, clientSecret } = getJamendoEnv();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: "JAMENDO_DISABLED" }, { status: 400 });
  }

  const state = globalThis.crypto?.randomUUID?.() || String(Date.now());
  const redirectUri = getOAuthRedirectUrl(req);
  const url = new URL(getJamendoAuthorizeUrl());
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "music");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  setOauthStateCookie(res, state);
  return res;
}
