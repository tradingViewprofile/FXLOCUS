import { NextRequest, NextResponse } from "next/server";

import { getJamendoApiBase, getJamendoEnv } from "@/lib/music/jamendo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;
const CHINESE_TAGS = ["chinese", "mandarin", "cantonese", "china", "taiwan"];

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
  });
}

function mapJamendoRows(rows: any[]) {
  return rows
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
        shareUrl,
        storeUrl: null
      };
    })
    .filter(Boolean);
}

function mapItunesRows(rows: any[]) {
  return rows
    .map((row: any) => {
      const id = String(row?.trackId || row?.collectionId || "").trim();
      const name = String(row?.trackName || "").trim();
      const preview = String(row?.previewUrl || "").trim();
      if (!id || !name || !preview) return null;
      return {
        id: `itunes:${id}`,
        name,
        artist: String(row?.artistName || ""),
        album: String(row?.collectionName || ""),
        cover: String(row?.artworkUrl100 || row?.artworkUrl60 || ""),
        url: preview,
        duration:
          typeof row?.trackTimeMillis === "number"
            ? Math.round(row.trackTimeMillis / 1000)
            : null,
        source: "itunes",
        license: null,
        licenseUrl: null,
        shareUrl: String(row?.trackViewUrl || row?.collectionViewUrl || ""),
        storeUrl: String(row?.trackViewUrl || row?.collectionViewUrl || "")
      };
    })
    .filter(Boolean);
}

function mapDeezerRows(rows: any[]) {
  return rows
    .map((row: any) => {
      const id = String(row?.id || "").trim();
      const name = String(row?.title || row?.title_short || "").trim();
      const preview = String(row?.preview || "").trim();
      if (!id || !name || !preview) return null;
      return {
        id: `deezer:${id}`,
        name,
        artist: String(row?.artist?.name || ""),
        album: String(row?.album?.title || ""),
        cover: String(row?.album?.cover_medium || row?.album?.cover || ""),
        url: preview,
        duration: typeof row?.duration === "number" ? row.duration : null,
        source: "deezer",
        license: null,
        licenseUrl: null,
        shareUrl: String(row?.link || ""),
        storeUrl: String(row?.link || "")
      };
    })
    .filter(Boolean);
}

function dedupeItems(items: any[]) {
  const seen = new Set<string>();
  const result: any[] = [];
  items.forEach((item) => {
    if (!item) return;
    const key = `${String(item.name || "").toLowerCase()}|${String(item.artist || "").toLowerCase()}`;
    if (!key.trim()) return;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

async function fetchItunesTracks(term: string, countries: string[], limit: number) {
  for (const country of countries) {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("country", country);
    url.searchParams.set("media", "music");
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
      cache: "no-store"
    });
    if (!res.ok) continue;
    const data = await res.json().catch(() => null);
    const rows = Array.isArray(data?.results) ? data.results : [];
    const items = mapItunesRows(rows);
    if (items.length) return items;
  }
  return [];
}

async function fetchDeezerTracks(term: string, limit: number) {
  const url = new URL("https://api.deezer.com/search");
  url.searchParams.set("q", term);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return mapDeezerRows(rows);
}

async function fetchDeezerChart(limit: number) {
  const url = new URL("https://api.deezer.com/chart/0/tracks");
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return mapDeezerRows(rows);
}

export async function GET(req: NextRequest) {
  const { clientId } = getJamendoEnv();
  const jamendoEnabled = Boolean(clientId);

  const { searchParams } = new URL(req.url);
  const mode = String(searchParams.get("mode") || "featured").toLowerCase();
  const rawTag = String(searchParams.get("tag") || "").trim().toLowerCase();
  const limit = Math.min(40, Math.max(6, Number(searchParams.get("limit") || 18)));

  const tagMap: Record<string, { jamendo: string; term: string }> = {
    hiphop: { jamendo: "hip-hop", term: "hip hop" },
    "hip-hop": { jamendo: "hip-hop", term: "hip hop" },
    soundtrack: { jamendo: "soundtrack", term: "soundtrack" },
    lounge: { jamendo: "lounge", term: "lounge" },
    electronic: { jamendo: "electronic", term: "electronic" },
    jazz: { jamendo: "jazz", term: "jazz" },
    pop: { jamendo: "pop", term: "pop" },
    rock: { jamendo: "rock", term: "rock" },
    classical: { jamendo: "classical", term: "classical" },
    world: { jamendo: "world", term: "world music" },
    chinese: { jamendo: "chinese", term: "mandarin chinese" }
  };

  const tagInfo = rawTag ? tagMap[rawTag] || { jamendo: rawTag, term: rawTag } : null;
  const searchTerm = tagInfo?.term || (mode === "hot" ? "top hits" : "popular music");
  const isChinese = tagInfo ? CHINESE_TAGS.includes(tagInfo.jamendo) : false;
  const countries = isChinese ? ["CN", "HK", "TW"] : ["US", "GB"];

  const fetchJamendoTracks = async (params: Record<string, string>) => {
    const url = new URL(`${getJamendoApiBase()}/tracks/`);
    url.searchParams.set("client_id", clientId || "");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("include", "musicinfo+licenses");
    url.searchParams.set("audioformat", "mp31");
    url.searchParams.set("imagesize", "200");
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`UPSTREAM_${res.status}`);
    const data = await res.json().catch(() => null);
    const rows = Array.isArray(data?.results) ? data.results : [];
    return mapJamendoRows(rows);
  };

  let jamendoItems: any[] = [];
  if (jamendoEnabled) {
    try {
      if (mode === "hot") {
        jamendoItems = await fetchJamendoTracks({ featured: "1", order: "rating_desc" });
      } else if (mode === "station") {
        jamendoItems = await fetchJamendoTracks({ featured: "1", order: "rating_desc", tags: tagInfo?.jamendo || "" });
      } else {
        jamendoItems = await fetchJamendoTracks({ featured: "1", order: "rating_desc", tags: tagInfo?.jamendo || "" });
      }
    } catch {
      jamendoItems = [];
    }
  }

  let deezerItems: any[] = [];
  if (mode === "hot" || mode === "featured") {
    deezerItems = await fetchDeezerChart(limit);
  }
  if (!deezerItems.length && searchTerm) {
    deezerItems = await fetchDeezerTracks(searchTerm, limit);
  }

  let itunesItems: any[] = [];
  if (searchTerm) {
    itunesItems = await fetchItunesTracks(searchTerm, countries, limit);
  }

  let combined = dedupeItems([...deezerItems, ...itunesItems, ...jamendoItems]).slice(0, limit);

  if (!combined.length && jamendoEnabled) {
    try {
      const fallback = await fetchJamendoTracks({ featured: "1", order: "popularity_total" });
      combined = dedupeItems(fallback).slice(0, limit);
    } catch {
      // ignore
    }
  }

  if (!combined.length && !jamendoEnabled) {
    combined = dedupeItems([...(await fetchDeezerChart(limit))]).slice(0, limit);
  }

  return json({ ok: true, items: combined });
}
