"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  src: string;
  poster?: string;
};

const DEFAULT_MUTE_STORAGE_KEY = "fxlocus_player_default_muted";

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const mm = hours ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function VideoPlayer({ src, poster }: Props) {
  const t = useTranslations("player");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [defaultMuted, setDefaultMuted] = useState(true);
  const [muted, setMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState("1080p");

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(100, Math.max(0, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  const applyPlaybackState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.volume = volume;
    video.playbackRate = playbackRate;
  }, [muted, playbackRate, volume]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEFAULT_MUTE_STORAGE_KEY);
      if (raw === "0") {
        setDefaultMuted(false);
        setMuted(false);
      } else if (raw === "1") {
        setDefaultMuted(true);
        setMuted(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DEFAULT_MUTE_STORAGE_KEY, defaultMuted ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [defaultMuted]);

  useEffect(() => {
    applyPlaybackState();
  }, [applyPlaybackState]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        // ignore autoplay restrictions
      }
      return;
    }
    video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((v) => !v);
  }, []);

  const toggleDefaultMute = useCallback(() => {
    setDefaultMuted((v) => {
      const next = !v;
      setMuted(next);
      return next;
    });
  }, []);

  const onSeek = useCallback((nextPercent: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const nextTime = (Math.min(100, Math.max(0, nextPercent)) / 100) * duration;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const setVideoVolume = useCallback((next: number) => {
    const nextVolume = Math.min(1, Math.max(0, next));
    setVolume(nextVolume);
    if (nextVolume === 0) setMuted(true);
    else setMuted(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };

    const activeElement = doc.fullscreenElement ?? doc.webkitFullscreenElement;
    if (activeElement) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
        return;
      }
      if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
      return;
    }

    const request = (container as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    }).requestFullscreen;

    if (request) {
      await request.call(container);
      return;
    }

    const webkitRequest = (container as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    }).webkitRequestFullscreen;

    if (webkitRequest) await webkitRequest.call(container);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fx-card overflow-hidden p-0 [writing-mode:horizontal-tb] [text-orientation:mixed]"
    >
      <div className="relative aspect-video w-full bg-black/40">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full"
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
            setIsReady(true);
            applyPlaybackState();
          }}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
          aria-label={isPlaying ? t("pause") : t("play")}
        >
          <div className="rounded-full border border-white/15 bg-slate-950/40 px-5 py-3 text-sm font-semibold text-slate-50 opacity-0 backdrop-blur-md transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100">
            {isPlaying ? t("pause") : t("play")}
          </div>
        </button>

        <div className="absolute inset-x-0 bottom-0">
          <div className="bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent px-4 pb-4 pt-8">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-sky-300"
              aria-label={t("seek")}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200/80 [writing-mode:horizontal-tb] [text-orientation:mixed]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                >
                  {isPlaying ? t("pause") : t("play")}
                </button>

                <span className="tabular-nums whitespace-nowrap">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                >
                  {muted ? t("unmute") : t("mute")}
                </button>

                <label className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-slate-200/70 whitespace-nowrap">{t("volume")}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => setVideoVolume(Number(e.target.value))}
                    className="h-1.5 w-24 cursor-pointer accent-sky-300"
                    aria-label={t("volume")}
                  />
                </label>

                <label className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-slate-200/70 whitespace-nowrap">{t("speed")}</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    className="fx-select px-3 py-2 text-xs"
                    aria-label={t("speed")}
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}x
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-slate-200/70 whitespace-nowrap">{t("quality")}</span>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="fx-select px-3 py-2 text-xs"
                    aria-label={t("quality")}
                    disabled={!isReady}
                  >
                    <option value="1080p">1080p</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-50">
                  <input
                    type="checkbox"
                    className="accent-sky-300"
                    checked={defaultMuted}
                    onChange={toggleDefaultMute}
                    aria-label={t("defaultMute")}
                  />
                  <span className="text-xs">{t("defaultMute")}</span>
                </label>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                >
                  {t("fullscreen")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

