import { NextRequest, NextResponse } from "next/server";

import {
  clearOauthState,
  clearTokensCookies,
  getJamendoEnv,
  getJamendoGrantUrl,
  getOAuthRedirectUrl,
  readOauthState,
  setTokensCookies
} from "@/lib/music/jamendo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlResponse(content: string, status = 200) {
  return new NextResponse(content, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function buildBridgePage(origin: string, payload: Record<string, unknown>) {
  const safeOrigin = origin || "*";
  const message = JSON.stringify(payload);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jamendo OAuth</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #0b1222; color: #e2e8f0; display: grid; place-items: center; height: 100vh; margin: 0; }
      .card { padding: 20px 24px; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); text-align: center; }
      .hint { margin-top: 8px; font-size: 12px; opacity: 0.7; }
    </style>
  </head>
  <body>
    <div class="card">
      <div>Jamendo connected. You can close this window.</div>
      <div class="hint">If it does not close automatically, close it manually.</div>
    </div>
    <script>
      (function() {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(${message}, ${JSON.stringify(safeOrigin)});
          }
        } catch (e) {}
        setTimeout(function(){ window.close(); }, 200);
      })();
    </script>
  </body>
</html>`;
}

export async function GET(req: NextRequest) {
  const { clientId, clientSecret } = getJamendoEnv();
  const code = String(req.nextUrl.searchParams.get("code") || "").trim();
  const state = String(req.nextUrl.searchParams.get("state") || "").trim();
  const error = String(req.nextUrl.searchParams.get("error") || "").trim();

  const origin = req.nextUrl.origin;
  const expectedState = readOauthState(req);

  if (error) {
    const res = htmlResponse(buildBridgePage(origin, { type: "jamendo:connected", ok: false, error }));
    clearOauthState(res);
    return res;
  }
  if (!clientId || !clientSecret) {
    const res = htmlResponse(
      buildBridgePage(origin, { type: "jamendo:connected", ok: false, error: "JAMENDO_DISABLED" }),
      400
    );
    clearOauthState(res);
    return res;
  }
  if (!code || !state || state !== expectedState) {
    const res = htmlResponse(
      buildBridgePage(origin, { type: "jamendo:connected", ok: false, error: "STATE_MISMATCH" }),
      400
    );
    clearOauthState(res);
    return res;
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", getOAuthRedirectUrl(req));

  try {
    const tokenRes = await fetch(getJamendoGrantUrl(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });

    if (!tokenRes.ok) {
      const payload = { type: "jamendo:connected", ok: false, error: `UPSTREAM_${tokenRes.status}` };
      const res = htmlResponse(buildBridgePage(origin, payload), 502);
      clearOauthState(res);
      return res;
    }

    const json = await tokenRes.json().catch(() => null);
    const accessToken =
      String(json?.access_token || json?.results?.[0]?.access_token || "").trim();
    const refreshToken =
      String(json?.refresh_token || json?.results?.[0]?.refresh_token || "").trim();
    const expiresIn =
      Number(json?.expires_in || json?.results?.[0]?.expires_in || 0) || 7200;

    if (!accessToken) {
      const res = htmlResponse(
        buildBridgePage(origin, { type: "jamendo:connected", ok: false, error: "TOKEN_MISSING" }),
        502
      );
      clearOauthState(res);
      return res;
    }

    const res = htmlResponse(buildBridgePage(origin, { type: "jamendo:connected", ok: true }));
    setTokensCookies(res, { accessToken, refreshToken, expiresIn });
    clearOauthState(res);
    return res;
  } catch (e: any) {
    const res = htmlResponse(
      buildBridgePage(origin, { type: "jamendo:connected", ok: false, error: "TOKEN_FAILED" }),
      500
    );
    clearTokensCookies(res);
    clearOauthState(res);
    return res;
  }
}
