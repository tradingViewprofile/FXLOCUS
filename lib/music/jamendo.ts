import type { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "jamendo_access_token";
const REFRESH_COOKIE = "jamendo_refresh_token";
const EXPIRES_COOKIE = "jamendo_token_expires";
const STATE_COOKIE = "jamendo_oauth_state";

const AUTHORIZE_URL = "https://api.jamendo.com/v3.0/oauth/authorize";
const GRANT_URL = "https://api.jamendo.com/v3.0/oauth/grant";
const API_BASE = "https://api.jamendo.com/v3.0";

type JamendoTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export function getJamendoEnv() {
  const clientId = String(process.env.JAMENDO_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.JAMENDO_CLIENT_SECRET || "").trim();
  const redirectOverride = String(process.env.JAMENDO_REDIRECT_URL || "").trim();
  return { clientId, clientSecret, redirectOverride };
}

export function getJamendoApiBase() {
  return API_BASE;
}

export function getJamendoAuthorizeUrl() {
  return AUTHORIZE_URL;
}

export function getJamendoGrantUrl() {
  return GRANT_URL;
}

export function getOAuthRedirectUrl(req: NextRequest) {
  const { redirectOverride } = getJamendoEnv();
  if (redirectOverride) return redirectOverride.replace(/\/+$/, "");
  const base = String(process.env.APP_BASE_URL || "").trim();
  const origin = base ? base.replace(/\/+$/, "") : req.nextUrl.origin;
  return `${origin}/api/system/music/jamendo/callback`;
}

export function readTokens(req: NextRequest): JamendoTokens {
  const accessToken = String(req.cookies.get(ACCESS_COOKIE)?.value || "");
  const refreshToken = String(req.cookies.get(REFRESH_COOKIE)?.value || "");
  const expiresAt = Number(req.cookies.get(EXPIRES_COOKIE)?.value || 0);
  return {
    accessToken,
    refreshToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0
  };
}

export function setTokensCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken?: string | null; expiresIn?: number | null }
) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = Math.max(60, Number(tokens.expiresIn || 7200));
  const expiresAt = Date.now() + maxAge * 1000;
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge
  });
  if (tokens.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  res.cookies.set(EXPIRES_COOKIE, String(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge
  });
}

export function clearTokensCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { maxAge: 0, path: "/" });
  res.cookies.set(REFRESH_COOKIE, "", { maxAge: 0, path: "/" });
  res.cookies.set(EXPIRES_COOKIE, "", { maxAge: 0, path: "/" });
}

export function setOauthStateCookie(res: NextResponse, state: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 600
  });
}

export function readOauthState(req: NextRequest) {
  return String(req.cookies.get(STATE_COOKIE)?.value || "");
}

export function clearOauthState(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/" });
}

export async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  if (!refreshToken || !clientId || !clientSecret) return null;
  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);

  const res = await fetch(GRANT_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const accessToken =
    String(json?.access_token || json?.results?.[0]?.access_token || "").trim();
  const newRefresh =
    String(json?.refresh_token || json?.results?.[0]?.refresh_token || "").trim();
  const expiresIn =
    Number(json?.expires_in || json?.results?.[0]?.expires_in || 0) || 7200;
  if (!accessToken) return null;
  return { accessToken, refreshToken: newRefresh || refreshToken, expiresIn };
}

