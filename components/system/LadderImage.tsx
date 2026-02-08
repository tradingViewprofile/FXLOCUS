"use client";

import { useEffect, useMemo, useState } from "react";

import { ClientDateTime } from "@/components/system/ClientDateTime";

function withCacheBust(url: string, t: number) {
  const hasQuery = url.includes("?");
  return `${url}${hasQuery ? "&" : "?"}t=${t}`;
}

export default function LadderImage(props: {
  baseUrl: string;
  intervalMs?: number;
  className?: string;
  showSource?: boolean;
}) {
  const { baseUrl, intervalMs = 60000, className, showSource = true } = props;
  const [nonce, setNonce] = useState<number | null>(null);

  useEffect(() => {
    setNonce(Date.now());
    const timer = setInterval(() => setNonce(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const src = useMemo(() => (nonce ? withCacheBust(baseUrl, nonce) : baseUrl), [baseUrl, nonce]);

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm opacity-80">
          自动刷新：{Math.round(intervalMs / 1000)} 秒 | 上次刷新：
          <ClientDateTime value={nonce ?? undefined} fallback="-" />
        </div>
        <button
          type="button"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
          onClick={() => setNonce(Date.now())}
        >
          手动刷新
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={nonce}
        src={src}
        alt="Ladder"
        className="w-full rounded-xl border border-white/10 bg-black/20"
        style={{ maxHeight: "70vh", objectFit: "contain" }}
      />

      {showSource ? (
        <div className="mt-2 break-all text-xs opacity-60">
          源地址：
          <a className="underline" href={baseUrl} target="_blank" rel="noreferrer">
            {baseUrl}
          </a>
        </div>
      ) : null}
    </div>
  );
}
