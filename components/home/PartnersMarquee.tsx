"use client";

import { memo, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

export type PartnerItem = {
  id: string;
  name: string;
  logo?: string;
  category: string;
  accent?: "sky" | "emerald" | "amber" | "violet";
};

const accentClassName: Record<NonNullable<PartnerItem["accent"]>, string> = {
  sky: "border-sky-400/30 text-sky-100/80",
  emerald: "border-emerald-400/30 text-emerald-100/80",
  amber: "border-amber-400/30 text-amber-100/80",
  violet: "border-violet-400/30 text-violet-100/80"
};

const REMOTE_LOGO_RE = /^https?:\/\//i;

function buildTextLogo(name: string) {
  const safe = name.replace(/[^A-Za-z0-9 ._-]/g, "").trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="40" viewBox="0 0 180 40"><rect width="180" height="40" rx="8" fill="rgba(15,23,42,0.35)"/><text x="90" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#e2e8f0" letter-spacing="1.2">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function LogoTile({ item }: { item: PartnerItem }) {
  const accent = item.accent ?? "sky";
  const logoSrc = item.logo && !REMOTE_LOGO_RE.test(item.logo)
    ? item.logo
    : buildTextLogo(item.name);
  return (
    <div
      className={[
        "flex min-w-[180px] flex-col gap-1 rounded-2xl border bg-slate-950/50 px-5 py-3 text-left",
        accentClassName[accent]
      ].join(" ")}
    >
      {logoSrc ? (
        <div className="flex h-8 items-center">
          <img
            src={logoSrc}
            alt={`${item.name} logo`}
            className="h-6 w-auto max-w-[140px] object-contain opacity-90"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-50/90">
          {item.name}
        </span>
      )}
      <span className="text-[11px] tracking-[0.18em] text-slate-200/60">
        {item.category}
      </span>
    </div>
  );
}

export const PartnersMarquee = memo(function PartnersMarquee({ items }: { items: PartnerItem[] }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <LogoTile key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const rowStyle = {
    "--marquee-duration": "36s"
  } as CSSProperties;

  const rowStyleAlt = {
    "--marquee-duration": "42s"
  } as CSSProperties;

  const reversed = [...items].reverse();

  return (
    <div className="space-y-5">
      <div className="fx-marquee" style={rowStyle}>
        <div className="fx-marquee-track">
          {[...items, ...items].map((item, idx) => (
            <div key={`${item.id}-${idx}`} aria-hidden={idx >= items.length}>
              <LogoTile item={item} />
            </div>
          ))}
        </div>
      </div>
      <div className="fx-marquee" style={rowStyleAlt}>
        <div className="fx-marquee-track fx-marquee-track-reverse">
          {[...reversed, ...reversed].map((item, idx) => (
            <div key={`${item.id}-alt-${idx}`} aria-hidden={idx >= reversed.length}>
              <LogoTile item={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
