import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function isCjkQuery(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}

const CHINESE_TAGS = ["chinese", "mandarin", "cantonese", "china", "taiwan"];
const DEFAULT_LIMIT = 24;

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
        shareUrl
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

async function fetchItunesTracks(term: string, countries: string[]) {
  for (const country of countries) {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", term);
    url.searchParams.set("entity", "song");
    url.searchParams.set("limit", String(DEFAULT_LIMIT));
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

async function fetchDeezerTracks(term: string) {
  const url = new URL("https://api.deezer.com/search");
  url.searchParams.set("q", term);
  url.searchParams.set("limit", String(DEFAULT_LIMIT));
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const rows = Array.isArray(data?.data) ? data.data : [];
  return mapDeezerRows(rows);
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

async function fetchJamendoTracks(params: Record<string, string>) {
  const jamendoUrl = new URL("https://api.jamendo.com/v3.0/tracks/");
  Object.entries(params).forEach(([key, value]) => {
    if (value) jamendoUrl.searchParams.set(key, value);
  });
  const jamRes = await fetch(jamendoUrl.toString(), {
    headers: { accept: "application/json", "user-agent": "fxlocus/1.0" },
    cache: "no-store"
  });
  if (!jamRes.ok) throw new Error(`UPSTREAM_${jamRes.status}`);
  const jamData = await jamRes.json().catch(() => null);
  const rows = Array.isArray(jamData?.results) ? jamData.results : [];
  return mapJamendoRows(rows);
}

export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return json({ ok: false, error: "EMPTY_QUERY" }, 400);

  try {
    const jamendoId = String(process.env.JAMENDO_CLIENT_ID || "").trim();
    const jamendoEnabled = Boolean(jamendoId);

    const baseParams = {
      client_id: jamendoId,
      format: "json",
      limit: String(DEFAULT_LIMIT),
      include: "musicinfo+licenses",
      audioformat: "mp31",
      imagesize: "200"
    };

    const attempts: Array<Record<string, string>> = [];
    const cjk = isCjkQuery(q);
    if (cjk) {
      attempts.push({ namesearch: q, lang: "zh" });
      attempts.push({ namesearch: q });
      attempts.push({ search: q, lang: "zh" });
      CHINESE_TAGS.forEach((tag) => {
        attempts.push({ tags: tag, order: "popularity_total" });
      });
    }
    attempts.push({ search: q });

    const itunesPromise = fetchItunesTracks(q, cjk ? ["CN", "HK", "TW"] : ["US", "GB"]);
    const deezerPromise = fetchDeezerTracks(q);
    const jamendoPromise = jamendoEnabled
      ? (async () => {
          let items: any[] = [];
          let lastError: string | null = null;
          for (const attempt of attempts) {
            try {
              items = await fetchJamendoTracks({ ...baseParams, ...attempt });
              if (items.length) break;
            } catch (err: any) {
              lastError = err?.message || "SEARCH_FAILED";
            }
          }
          if (!items.length && cjk) {
            for (const tag of CHINESE_TAGS) {
              try {
                items = await fetchJamendoTracks({ ...baseParams, tags: tag, order: "popularity_total" });
                if (items.length) break;
              } catch (err: any) {
                lastError = err?.message || lastError;
              }
            }
            if (!items.length) {
              try {
                items = await fetchJamendoTracks({ ...baseParams, featured: "1", order: "popularity_total" });
              } catch (err: any) {
                lastError = err?.message || lastError;
              }
            }
          }
          return { items, lastError };
        })()
      : Promise.resolve({ items: [], lastError: null });

    const [itunesRes, deezerRes, jamendoRes] = await Promise.allSettled([
      itunesPromise,
      deezerPromise,
      jamendoPromise
    ]);

    const itunesItems = itunesRes.status === "fulfilled" ? itunesRes.value : [];
    const deezerItems = deezerRes.status === "fulfilled" ? deezerRes.value : [];
    const jamendoItems =
      jamendoRes.status === "fulfilled" ? jamendoRes.value.items : [];

    let combined = cjk
      ? [...itunesItems, ...deezerItems, ...jamendoItems]
      : [...itunesItems, ...jamendoItems, ...deezerItems];
    combined = dedupeItems(combined).slice(0, DEFAULT_LIMIT);

    if (!combined.length && jamendoEnabled) {
      try {
        const fallback = await fetchJamendoTracks({
          ...baseParams,
          featured: "1",
          order: "popularity_total"
        });
        combined = dedupeItems(fallback).slice(0, DEFAULT_LIMIT);
      } catch {
        // ignore
      }
    }

    const lastError =
      jamendoRes.status === "fulfilled" ? jamendoRes.value.lastError : null;
    if (!combined.length && lastError) {
      return json({ ok: false, error: lastError }, 502);
    }

    return json({ ok: true, items: combined });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "SEARCH_FAILED" }, 500);
  }
}
