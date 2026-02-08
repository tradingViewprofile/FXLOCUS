import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function GET(req: NextRequest) {
  const id = String(req.nextUrl.searchParams.get("id") || "").trim();
  if (!id) return json({ ok: false, error: "EMPTY_ID" }, 400);

  try {
    const [rawSource, rawId] = id.includes(":") ? id.split(":") : ["jamendo", id];
    const source = rawSource || "jamendo";
    const trackId = rawId || id;

    if (source === "itunes") {
      const url = new URL("https://itunes.apple.com/lookup");
      url.searchParams.set("id", trackId);
      url.searchParams.set("entity", "song");
      const res = await fetch(url.toString(), {
        headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
        cache: "no-store"
      });
      if (!res.ok) return json({ ok: false, error: `UPSTREAM_${res.status}` }, 502);
      const data = await res.json().catch(() => null);
      const rows = Array.isArray(data?.results) ? data.results : [];
      const row = rows.find((item: any) => item?.previewUrl) || rows[0];
      const audio = String(row?.previewUrl || "").trim();
      if (!audio) return json({ ok: false, error: "NO_AUDIO" }, 404);
      return json({
        ok: true,
        source: "itunes",
        url: audio,
        sourceUrl: null,
        duration:
          typeof row?.trackTimeMillis === "number"
            ? Math.round(row.trackTimeMillis / 1000)
            : null,
        cover: String(row?.artworkUrl100 || row?.artworkUrl60 || ""),
        license: null,
        licenseUrl: null,
        shareUrl: String(row?.trackViewUrl || row?.collectionViewUrl || ""),
        storeUrl: String(row?.trackViewUrl || row?.collectionViewUrl || "")
      });
    }

    if (source === "deezer") {
      const res = await fetch(`https://api.deezer.com/track/${encodeURIComponent(trackId)}`, {
        headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
        cache: "no-store"
      });
      if (!res.ok) return json({ ok: false, error: `UPSTREAM_${res.status}` }, 502);
      const row = await res.json().catch(() => null);
      const audio = String(row?.preview || "").trim();
      if (!audio) return json({ ok: false, error: "NO_AUDIO" }, 404);
      return json({
        ok: true,
        source: "deezer",
        url: audio,
        sourceUrl: null,
        duration: typeof row?.duration === "number" ? row.duration : null,
        cover: String(row?.album?.cover_medium || row?.album?.cover || ""),
        license: null,
        licenseUrl: null,
        shareUrl: String(row?.link || ""),
        storeUrl: String(row?.link || "")
      });
    }

    const clientId = String(process.env.JAMENDO_CLIENT_ID || "").trim();
    if (!clientId) return json({ ok: false, error: "JAMENDO_DISABLED" }, 400);
    const jamUrl = new URL("https://api.jamendo.com/v3.0/tracks/");
    jamUrl.searchParams.set("client_id", clientId);
    jamUrl.searchParams.set("format", "json");
    jamUrl.searchParams.set("id", trackId);
    jamUrl.searchParams.set("include", "musicinfo+licenses");
    const jamRes = await fetch(jamUrl.toString(), {
      headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
      cache: "no-store"
    });
    if (!jamRes.ok) return json({ ok: false, error: `UPSTREAM_${jamRes.status}` }, 502);
    const jamData = await jamRes.json().catch(() => null);
    const row = Array.isArray(jamData?.results) ? jamData.results[0] : null;
    const audioPrimary = String(row?.audio || row?.audiodownload || "").trim();
    const audioFallback = String(row?.audiodownload || row?.audio || "").trim();
    if (!audioPrimary && !audioFallback) return json({ ok: false, error: "NO_AUDIO" }, 404);
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
    const duration = typeof row?.duration === "number" ? row.duration : null;
    const cover = String(row?.image || row?.album_image || "");

    return json({
      ok: true,
      source: "jamendo",
      url: audioPrimary || audioFallback,
      sourceUrl: audioFallback && audioFallback !== audioPrimary ? audioFallback : null,
      duration,
      cover,
      license,
      licenseUrl,
      shareUrl,
      storeUrl: null
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "LOOKUP_FAILED" }, 500);
  }
}
