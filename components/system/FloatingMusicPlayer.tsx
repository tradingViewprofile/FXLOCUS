"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Search,
  Sparkles,
  Volume2,
  X
} from "lucide-react";

type Track = {
  id: string;
  name: string;
  artist?: string | null;
  album?: string | null;
  cover?: string | null;
  url?: string | null;
  sourceUrl?: string | null;
  duration?: number | null;
  source?: "jamendo" | "itunes" | "deezer";
  license?: string | null;
  licenseUrl?: string | null;
  shareUrl?: string | null;
  storeUrl?: string | null;
};

type RepeatMode = "off" | "one" | "list";

const FAVORITES_KEY = "fxlocus_music_favorites";
const PANEL_STATE_KEY = "fxlocus_music_panel";
const VOLUME_KEY = "fxlocus_music_volume";
const HISTORY_KEY = "fxlocus_music_history";
const PANEL_MIN_WIDTH = 320;
const PANEL_MIN_HEIGHT = 360;
const PANEL_PADDING = 16;
const DEFAULT_PANEL_WIDTH = 350;
const DEFAULT_PANEL_HEIGHT = 500;
const HISTORY_MAX = 40;

const STATIONS = [
  { key: "lounge", zh: "Lounge", en: "Lounge" },
  { key: "electronic", zh: "电子", en: "Electronic" },
  { key: "jazz", zh: "爵士", en: "Jazz" },
  { key: "pop", zh: "流行", en: "Pop" },
  { key: "hip-hop", zh: "嘻哈", en: "Hip Hop" },
  { key: "rock", zh: "摇滚", en: "Rock" },
  { key: "classical", zh: "古典", en: "Classical" },
  { key: "soundtrack", zh: "影视配乐", en: "Soundtrack" },
  { key: "world", zh: "世界音乐", en: "World" },
  { key: "chinese", zh: "中文", en: "Chinese" }
];

function formatTrackLabel(track: Track) {
  const artist = track.artist ? ` - ${track.artist}` : "";
  return `${track.name}${artist}`;
}

function dedupeTracks(tracks: Track[]) {
  const seen = new Set<string>();
  const result: Track[] = [];
  tracks.forEach((track) => {
    if (!track?.id || seen.has(track.id)) return;
    seen.add(track.id);
    result.push(track);
  });
  return result;
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "00:00";
  const total = Math.floor(value);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatErrorMessage(error: string | null, locale: "zh" | "en") {
  if (!error) return null;
  const key = error.toUpperCase();
  const map: Record<string, { zh: string; en: string }> = {
    EMPTY_QUERY: { zh: "请输入关键词", en: "Please enter a keyword" },
    JAMENDO_DISABLED: { zh: "音乐服务未配置", en: "Music service is not configured" },
    NO_AUDIO: { zh: "未找到可播放的音频", en: "No playable audio found" },
    SEARCH_FAILED: { zh: "搜索失败，请稍后再试", en: "Search failed, try again later" },
    TRACK_FAILED: { zh: "获取音频失败", en: "Failed to load track" },
    DISCOVER_FAILED: { zh: "加载推荐失败", en: "Failed to load recommendations" }
  };
  if (key.startsWith("UPSTREAM_")) {
    return locale === "zh" ? "音乐服务暂不可用" : "Music service is unavailable";
  }
  const hit = map[key];
  if (hit) return locale === "zh" ? hit.zh : hit.en;
  return error;
}

function loadPanelState(): { width: number; height: number; x?: number; y?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PANEL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.width === "number" && typeof parsed?.height === "number") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function savePanelState(state: { width: number; height: number; x: number; y: number }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PANEL_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getSystemContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(".system-main") as HTMLElement | null;
}

export function FloatingMusicPlayer({ locale }: { locale: "zh" | "en" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Track[]>([]);
  const [favorites, setFavorites] = React.useState<Track[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [current, setCurrent] = React.useState<Track | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.7);
  const [repeatMode, setRepeatMode] = React.useState<RepeatMode>("off");
  const [discoverItems, setDiscoverItems] = React.useState<Track[]>([]);
  const [discoverLoading, setDiscoverLoading] = React.useState(false);
  const [resultMode, setResultMode] = React.useState<"search" | "discover">("discover");
  const [resultLabel, setResultLabel] = React.useState<string>("");
  const [history, setHistory] = React.useState<Track[]>([]);
  const [historyLoaded, setHistoryLoaded] = React.useState(false);
  const [containerRect, setContainerRect] = React.useState<DOMRect | null>(null);
  const [panel, setPanel] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const playSeq = React.useRef(0);
  const panelDrag = React.useRef({ on: false, resize: false, sx: 0, sy: 0, px: 0, py: 0, w: 0, h: 0 });

  const pushHistory = React.useCallback((track: Track) => {
    setHistory((prev) => {
      const cleaned = prev.filter((item) => item.id !== track.id);
      const next = dedupeTracks([{ ...track }, ...cleaned]);
      return next.slice(0, HISTORY_MAX);
    });
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const toggle = () => setOpen((prev) => !prev);
    const openPanel = () => setOpen(true);
    const closePanel = () => setOpen(false);
    (window as any).__fxMusicToggle = toggle;
    (window as any).__fxMusicOpen = openPanel;
    (window as any).__fxMusicClose = closePanel;
    return () => {
      delete (window as any).__fxMusicToggle;
      delete (window as any).__fxMusicOpen;
      delete (window as any).__fxMusicClose;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("fxmusic:state", { detail: { open } }));
  }, [open]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFavorites(dedupeTracks(parsed));
      }
    } catch {
      // ignore
    } finally {
      setFavoritesLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHistory(dedupeTracks(parsed));
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(VOLUME_KEY);
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        setVolume(clamp(parsed, 0, 1));
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!favoritesLoaded) return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesLoaded]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!historyLoaded) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history, historyLoaded]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // ignore
    }
  }, [volume]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = repeatMode === "one";
  }, [repeatMode]);

  React.useEffect(() => {
    const container = getSystemContainer();
    if (!container || typeof ResizeObserver === "undefined") return;

    const updateRect = () => {
      const rect = container.getBoundingClientRect();
      setContainerRect(rect);

      if (open) {
        setPanel((prev) => {
          const storedPanel = loadPanelState();
          const width = prev.width || storedPanel?.width || DEFAULT_PANEL_WIDTH;
          const height = prev.height || storedPanel?.height || DEFAULT_PANEL_HEIGHT;
          const nextWidth = clamp(width, PANEL_MIN_WIDTH, rect.width - PANEL_PADDING * 2);
          const nextHeight = clamp(height, PANEL_MIN_HEIGHT, rect.height - PANEL_PADDING * 2);
          const baseX = storedPanel?.x ?? prev.x ?? rect.right - nextWidth - PANEL_PADDING;
          const baseY = storedPanel?.y ?? prev.y ?? rect.top + PANEL_PADDING;
          const nextX = clamp(baseX, rect.left + PANEL_PADDING, rect.right - nextWidth - PANEL_PADDING);
          const nextY = clamp(baseY, rect.top + PANEL_PADDING, rect.bottom - nextHeight - PANEL_PADDING);
          return { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
        });
      }
    };

    updateRect();
    const observer = new ResizeObserver(updateRect);
    observer.observe(container);
    return () => observer.disconnect();
  }, [open]);

  React.useEffect(() => {
    if (!open || !containerRect) return;
    const storedPanel = loadPanelState();
    const nextWidth = clamp(
      storedPanel?.width || DEFAULT_PANEL_WIDTH,
      PANEL_MIN_WIDTH,
      containerRect.width - PANEL_PADDING * 2
    );
    const nextHeight = clamp(
      storedPanel?.height || DEFAULT_PANEL_HEIGHT,
      PANEL_MIN_HEIGHT,
      containerRect.height - PANEL_PADDING * 2
    );
    const nextX = clamp(
      storedPanel?.x ?? containerRect.right - nextWidth - PANEL_PADDING,
      containerRect.left + PANEL_PADDING,
      containerRect.right - nextWidth - PANEL_PADDING
    );
    const nextY = clamp(
      storedPanel?.y ?? containerRect.top + PANEL_PADDING,
      containerRect.top + PANEL_PADDING,
      containerRect.bottom - nextHeight - PANEL_PADDING
    );
    setPanel({ x: nextX, y: nextY, width: nextWidth, height: nextHeight });
  }, [open, containerRect]);

  React.useEffect(() => {
    if (!containerRect) return;
    if (!panel.width || !panel.height) return;
    savePanelState(panel);
  }, [panel, containerRect]);

  const runDiscover = React.useCallback(
    async (mode: "featured" | "hot" | "station", tag?: string, label?: string) => {
      setDiscoverLoading(true);
      setError(null);
      setResultMode("discover");
      setResultLabel(label || (locale === "zh" ? "推荐歌单" : "Discover"));
      try {
        const url = new URL("/api/system/music/recommend", window.location.origin);
        url.searchParams.set("mode", mode);
        if (tag) url.searchParams.set("tag", tag);
        const res = await fetch(url.toString());
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "discover_failed");
        setDiscoverItems(Array.isArray(json.items) ? (json.items as Track[]) : []);
      } catch (e: any) {
        setDiscoverItems([]);
        setError(e?.message || "discover_failed");
      } finally {
        setDiscoverLoading(false);
      }
    },
    [locale]
  );

  const runSearch = React.useCallback(async (keyword?: string) => {
    const text = (keyword ?? query).trim();
    if (!text) return;
    setResultMode("search");
    setResultLabel(locale === "zh" ? "搜索结果" : "Search results");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/system/music/search?q=${encodeURIComponent(text)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "search_failed");
      setResults(Array.isArray(json.items) ? (json.items as Track[]) : []);
    } catch (e: any) {
      setResults([]);
      setError(e?.message || "search_failed");
    } finally {
      setLoading(false);
    }
  }, [query, locale]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, runSearch]);

  React.useEffect(() => {
    if (!open) return;
    if (resultMode !== "discover") return;
    if (discoverItems.length) return;
    const label = locale === "zh" ? "推荐歌单" : "Featured picks";
    setResultLabel(label);
    void runDiscover("featured", undefined, label);
  }, [open, resultMode, discoverItems.length, runDiscover, locale]);

  const resolveTrackUrl = React.useCallback(async (track: Track) => {
    if (track.url && track.source && track.source !== "jamendo") {
      return {
        url: track.url,
        sourceUrl: track.sourceUrl ?? null,
        duration: track.duration ?? null,
        cover: track.cover ?? null,
        license: track.license ?? null,
        licenseUrl: track.licenseUrl ?? null,
        shareUrl: track.shareUrl ?? null,
        storeUrl: track.storeUrl ?? null,
        source: track.source
      };
    }
    const res = await fetch(`/api/system/music/track?id=${encodeURIComponent(track.id)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(String(json?.error || "track_failed"));
    }
    return {
      url: String(json.url || ""),
      sourceUrl: json.sourceUrl ? String(json.sourceUrl) : null,
      duration: Number(json.duration || 0) || null,
      cover: json.cover ? String(json.cover) : null,
      license: json.license ? String(json.license) : null,
      licenseUrl: json.licenseUrl ? String(json.licenseUrl) : null,
      shareUrl: json.shareUrl ? String(json.shareUrl) : null,
      storeUrl: json.storeUrl ? String(json.storeUrl) : null,
      source: json.source ? String(json.source) : track.source ?? "jamendo"
    };
  }, []);

  const playTrack = React.useCallback(
    async (track: Track) => {
      setError(null);
      const seq = ++playSeq.current;
      try {
        const resolved = await resolveTrackUrl(track);
        const primaryUrl = resolved?.url || "";
        const fallbackUrl = resolved?.sourceUrl || "";
        if (!primaryUrl && !fallbackUrl) throw new Error("no_stream");
        const next: Track = {
          ...track,
          url: primaryUrl || fallbackUrl,
          sourceUrl: resolved.sourceUrl ?? track.sourceUrl ?? null,
          duration: resolved.duration ?? track.duration ?? null,
          cover: resolved.cover ?? track.cover ?? null,
          license: resolved.license ?? track.license ?? null,
          licenseUrl: resolved.licenseUrl ?? track.licenseUrl ?? null,
          shareUrl: resolved.shareUrl ?? track.shareUrl ?? null,
          storeUrl: resolved.storeUrl ?? track.storeUrl ?? null,
          source: (resolved.source as Track["source"]) ?? track.source ?? "jamendo"
        };
        setCurrent(next);
        setDuration(resolved.duration ?? track.duration ?? 0);
        setCurrentTime(0);
        pushHistory(next);

        const audio = audioRef.current;
        if (audio) {
          const tryPlay = async (url: string) => {
            audio.pause();
            audio.src = url;
            audio.currentTime = 0;
            audio.load();
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => {
                if (done) return;
                done = true;
                audio.removeEventListener("loadedmetadata", onReady);
                audio.removeEventListener("canplay", onReady);
                audio.removeEventListener("canplaythrough", onReady);
                clearTimeout(timer);
                resolve();
              };
              const onReady = () => {
                audio.currentTime = 0;
                finish();
              };
              const timer = window.setTimeout(finish, 4000);
              audio.addEventListener("loadedmetadata", onReady);
              audio.addEventListener("canplay", onReady);
              audio.addEventListener("canplaythrough", onReady);
            });
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise) {
              await playPromise.catch((err) => {
                if (playSeq.current !== seq) return;
                const message = String(err?.message || "");
                if (err?.name === "AbortError") return;
                if (message.includes("interrupted") || message.includes("The play() request was interrupted")) return;
                throw err;
              });
            }
          };

          try {
            if (primaryUrl) {
              await tryPlay(primaryUrl);
            } else if (fallbackUrl) {
              await tryPlay(fallbackUrl);
            }
          } catch (err) {
            if (playSeq.current !== seq) return;
            if (fallbackUrl && fallbackUrl !== primaryUrl) {
              await tryPlay(fallbackUrl);
            } else {
              throw err;
            }
          }
        }
      } catch (e: any) {
        if (playSeq.current !== seq) return;
        setError(e?.message || "play_failed");
      }
    },
    [resolveTrackUrl, pushHistory]
  );

  const playNextFavorite = React.useCallback(async () => {
    if (!favorites.length) return;
    const currentId = current?.id;
    const idx = favorites.findIndex((item) => item.id === currentId);
    const nextIndex = idx >= 0 ? (idx + 1) % favorites.length : 0;
    const next = favorites[nextIndex];
    if (next) {
      await playTrack(next);
    }
  }, [favorites, current, playTrack]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      if (repeatMode === "list") {
        void playNextFavorite();
      }
    };
    const onError = () => {
      setPlaying(false);
      setError(locale === "zh" ? "无法播放：无可用音频源" : "Playback failed: no supported source");
    };
    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    };
    const onTime = () => {
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("error", onError);
    };
  }, [repeatMode, locale, playNextFavorite]);

  const togglePlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current && favorites.length) {
      await playTrack(favorites[0]);
      return;
    }
    if (audio.paused) {
      try {
        if (audio.ended || audio.currentTime > 0) audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise) await playPromise.catch(() => null);
      } catch {
        // ignore
      }
    } else {
      audio.pause();
    }
  }, [current, favorites, playTrack]);

  const clearCurrent = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setCurrent(null);
    setPlaying(false);
  }, []);

  const isFavorite = React.useCallback(
    (track: Track) => favorites.some((item) => item.id === track.id),
    [favorites]
  );

  const toggleFavorite = React.useCallback(
    (track: Track) => {
      const exists = favorites.some((item) => item.id === track.id);
      setFavorites((prev) => {
        if (exists) {
          return prev.filter((item) => item.id !== track.id);
        }
        return dedupeTracks([{ ...track }, ...prev]);
      });
    },
    [favorites]
  );

  const cycleRepeat = React.useCallback(() => {
    setRepeatMode((prev) => (prev === "off" ? "one" : prev === "one" ? "list" : "off"));
  }, []);

  const repeatLabel =
    repeatMode === "one"
      ? locale === "zh"
        ? "单曲循环"
        : "Repeat one"
      : repeatMode === "list"
        ? locale === "zh"
          ? "列表循环"
          : "Repeat list"
      : locale === "zh"
          ? "不循环"
          : "No repeat";

  const errorMessage = formatErrorMessage(error, locale);
  const displayResults = resultMode === "discover" ? discoverItems : results;
  const isLoading = loading || discoverLoading;

  const onPanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRect) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, textarea, select, a")) return;
    panelDrag.current.on = true;
    panelDrag.current.resize = false;
    panelDrag.current.sx = event.clientX;
    panelDrag.current.sy = event.clientY;
    panelDrag.current.px = panel.x;
    panelDrag.current.py = panel.y;
    panelDrag.current.w = panel.width;
    panelDrag.current.h = panel.height;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPanelResizeDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!containerRect) return;
    panelDrag.current.on = true;
    panelDrag.current.resize = true;
    panelDrag.current.sx = event.clientX;
    panelDrag.current.sy = event.clientY;
    panelDrag.current.px = panel.x;
    panelDrag.current.py = panel.y;
    panelDrag.current.w = panel.width;
    panelDrag.current.h = panel.height;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDrag.current.on || !containerRect) return;
    const dx = event.clientX - panelDrag.current.sx;
    const dy = event.clientY - panelDrag.current.sy;
    if (panelDrag.current.resize) {
      const maxW = containerRect.right - panelDrag.current.px - PANEL_PADDING;
      const maxH = containerRect.bottom - panelDrag.current.py - PANEL_PADDING;
      const nextW = clamp(panelDrag.current.w + dx, PANEL_MIN_WIDTH, maxW);
      const nextH = clamp(panelDrag.current.h + dy, PANEL_MIN_HEIGHT, maxH);
      setPanel((prev) => ({ ...prev, width: nextW, height: nextH }));
      return;
    }

    const maxX = containerRect.right - panelDrag.current.w - PANEL_PADDING;
    const maxY = containerRect.bottom - panelDrag.current.h - PANEL_PADDING;
    const minX = containerRect.left + PANEL_PADDING;
    const minY = containerRect.top + PANEL_PADDING;
    const nextX = clamp(panelDrag.current.px + dx, minX, maxX);
    const nextY = clamp(panelDrag.current.py + dy, minY, maxY);
    setPanel((prev) => ({ ...prev, x: nextX, y: nextY }));
  };

  const seekTo = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const nextTime = clamp(value, 0, audio.duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const onPanelPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDrag.current.on) return;
    panelDrag.current.on = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const panelOrigin = "top right";

  const panelNode = (
    <div
      className={["music-panel-large", open ? "open" : ""].join(" ")}
      style={{
        left: panel.x,
        top: panel.y,
        width: panel.width || undefined,
        height: panel.height || undefined,
        transformOrigin: panelOrigin
      }}
    >
          <div
            className="music-panel-header flex items-center gap-2"
            onPointerDown={onPanelPointerDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={onPanelPointerUp}
          >
            <div className="text-base font-semibold text-[color:var(--text)]">
              {locale === "zh" ? "音乐播放器" : "Music Player"}
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
              }}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/10"
              aria-label="close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="music-panel-body">
            {current ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  {current.cover ? (
                    <img src={current.cover} alt={current.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-[color:var(--text)]">{current.name}</div>
                  <div className="truncate text-xs text-[color:var(--muted)]">
                    {current.artist || current.album || "-"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--muted)]">
                    {current.license ? (
                      current.licenseUrl ? (
                        <a
                          href={current.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-white/60 hover:text-white/80"
                        >
                          {current.license}
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/60">{current.license}</span>
                      )
                    ) : null}
                    {current.storeUrl ? (
                      <a
                        href={current.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-white/60 hover:text-white/80"
                      >
                        {current.source === "itunes"
                          ? "Apple Music"
                          : current.source === "deezer"
                          ? "Deezer"
                          : locale === "zh"
                          ? "来源"
                          : "Source"}
                      </a>
                    ) : current.shareUrl ? (
                      <a
                        href={current.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-white/60 hover:text-white/80"
                      >
                        {locale === "zh" ? "来源" : "Source"}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(duration, 1)}
                      step={1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="w-full music-range"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[color:var(--muted)]">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                  </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--muted)]">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(current)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                    >
                      <Heart
                        className={["h-3 w-3", isFavorite(current) ? "text-rose-200" : "text-white/60"].join(" ")}
                      />
                      {locale === "zh" ? (isFavorite(current) ? "已喜欢" : "加入喜欢") : isFavorite(current) ? "Liked" : "Like"}
                    </button>
                    <button
                      type="button"
                      onClick={cycleRepeat}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                      title={repeatLabel}
                    >
                      {repeatMode === "list" ? (
                        <ListMusic className="h-3 w-3" style={{ color: "var(--accent)" }} />
                      ) : (
                        <Repeat
                          className={["h-3 w-3", repeatMode === "one" ? "text-white" : "text-white/60"].join(" ")}
                          style={repeatMode === "one" ? { color: "var(--accent)" } : undefined}
                        />
                      )}
                      <span className="text-[11px]">{repeatLabel}</span>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-2)] bg-[color:var(--panel-3)] text-white hover:bg-white/10"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <Volume2 className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 music-range"
                />
                <span className="w-10 text-right text-[11px] text-[color:var(--muted)]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <button
                type="button"
                onClick={playing ? clearCurrent : togglePlay}
                className="mt-2 text-xs text-rose-200 hover:text-rose-100"
              >
                {playing ? (locale === "zh" ? "停止播放" : "Stop") : locale === "zh" ? "播放" : "Play"}
              </button>
            </div>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch(query);
                    }
                  }}
                  placeholder={locale === "zh" ? "搜索音乐..." : "Search music"}
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white/85"
                />
              </div>
              <button
                type="button"
                onClick={() => runSearch(query)}
                disabled={!query.trim() || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-2)] bg-[color:var(--panel-3)] px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-50"
              >
                {locale === "zh" ? "搜索" : "Go"}
              </button>
            </div>
            {isLoading ? <div className="mt-3 text-xs text-white/50">{locale === "zh" ? "加载中..." : "Loading..."}</div> : null}
            {errorMessage ? <div className="mt-2 text-xs text-rose-200">{errorMessage}</div> : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{resultLabel || (locale === "zh" ? "搜索结果" : "Search results")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const label = locale === "zh" ? "推荐歌单" : "Featured picks";
                      void runDiscover("featured", undefined, label);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  >
                    <Sparkles className="h-3 w-3" />
                    {locale === "zh" ? "推荐" : "Featured"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const label = locale === "zh" ? "热门曲目" : "Hot picks";
                      void runDiscover("hot", undefined, label);
                    }}
                    className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  >
                    {locale === "zh" ? "热门" : "Hot"}
                  </button>
                  {STATIONS.map((station) => (
                    <button
                      key={station.key}
                      type="button"
                      onClick={() => {
                        const label = locale === "zh" ? `电台 · ${station.zh}` : `Station · ${station.en}`;
                        void runDiscover("station", station.key, label);
                      }}
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                    >
                      {locale === "zh" ? station.zh : station.en}
                    </button>
                  ))}
                </div>
                {!isLoading && displayResults.length ? (
                  <div className="mt-2 max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {displayResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => playTrack(item)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 hover:bg-white/10"
                      >
                        <span className="flex-1 truncate">{formatTrackLabel(item)}</span>
                        <span className="text-[10px] text-white/45">
                          {item.duration ? formatDuration(Number(item.duration)) : "--:--"}
                        </span>
                        {item.source ? (
                          <span className="text-[10px] text-white/45">
                            {item.source === "itunes"
                              ? "Apple"
                              : item.source === "deezer"
                              ? "Deezer"
                              : "Jamendo"}
                          </span>
                        ) : null}
                        {item.license ? (
                          <span className="text-[10px] text-white/40">{item.license}</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(item);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/10"
                          title={locale === "zh" ? "加入喜欢" : "Like"}
                        >
                          <Heart className={["h-3 w-3", isFavorite(item) ? "text-rose-200" : "text-white/60"].join(" ")}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-white/45">{locale === "zh" ? "暂无结果" : "No results"}</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{locale === "zh" ? "喜欢列表" : "Favorites"}</span>
                  <button
                    type="button"
                    onClick={() => setRepeatMode((prev) => (prev === "list" ? "off" : "list"))}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  >
                    <ListMusic className="h-3 w-3" style={{ color: repeatMode === "list" ? "var(--accent)" : undefined }} />
                    {locale === "zh" ? "循环" : "Loop"}
                  </button>
                </div>
                {favorites.length ? (
                  <div className="mt-2 max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {favorites.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => playTrack(item)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 hover:bg-white/10"
                      >
                        <span className="flex-1 truncate">{formatTrackLabel(item)}</span>
                        <span className="text-[10px] text-white/45">
                          {item.duration ? formatDuration(Number(item.duration)) : "--:--"}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(item);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white/60 hover:bg-white/10"
                          title={locale === "zh" ? "移除" : "Remove"}
                        >
                          <Heart className="h-3 w-3 text-rose-200" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-white/45">{locale === "zh" ? "暂无喜欢" : "No favorites"}</div>
                )}

                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{locale === "zh" ? "最近播放" : "Recently played"}</span>
                    <button
                      type="button"
                      onClick={() => setHistory([])}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                    >
                      {locale === "zh" ? "清空" : "Clear"}
                    </button>
                  </div>
                  {history.length ? (
                    <div className="mt-2 max-h-[140px] space-y-2 overflow-y-auto pr-1">
                      {history.map((item) => (
                        <div
                          key={`history-${item.id}`}
                          onClick={() => playTrack(item)}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/80 hover:bg-white/10"
                        >
                          <span className="flex-1 truncate">{formatTrackLabel(item)}</span>
                          <span className="text-[10px] text-white/45">
                            {item.duration ? formatDuration(Number(item.duration)) : "--:--"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-white/45">{locale === "zh" ? "暂无记录" : "No history"}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="music-panel-resize"
            onPointerDown={onPanelResizeDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={onPanelPointerUp}
            role="presentation"
          />

          <audio ref={audioRef} preload="auto" />
        </div>
  );

  return (
    <>
      {portalTarget ? createPortal(panelNode, portalTarget) : panelNode}
    </>
  );
}
