"use client";

import type { CSSProperties } from "react";
import { memo, useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui/Card";

type Tone = "sky" | "rose" | "emerald" | "amber" | "violet";

export type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  summary: string;
  review?: string;
  rating: number;
  period: string;
  highlight: string;
  stat?: string;
  tone?: Tone;
  curveId?: string;
  curvePath?: string;
  curveImage?: string;
};

const toneClassName: Record<Tone, string> = {
  sky: "from-sky-500/25 via-slate-900/70 to-slate-950",
  rose: "from-rose-500/25 via-slate-900/70 to-slate-950",
  emerald: "from-emerald-500/25 via-slate-900/70 to-slate-950",
  amber: "from-amber-500/25 via-slate-900/70 to-slate-950",
  violet: "from-violet-500/25 via-slate-900/70 to-slate-950"
};

function TestimonialCard({ item }: { item: TestimonialItem }) {
  const tone = item.tone ?? "sky";
  const curvePath =
    item.curvePath ||
    "M4 68 C 30 60, 50 50, 70 46 C 96 40, 116 48, 140 36 C 162 26, 184 30, 206 18 L 236 10";
  const hasCurveImage = Boolean(item.curveImage);
  const rating = Math.min(5, Math.max(0, Math.round(item.rating)));
  return (
    <Card className="min-w-[280px] max-w-[360px] shrink-0 p-5">
      <div
        className={[
          "relative h-36 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br md:h-40",
          hasCurveImage ? "bg-white/95" : toneClassName[tone]
        ].join(" ")}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
        {hasCurveImage ? (
          <picture>
            <source
              type="image/webp"
              srcSet={item.curveImage?.replace(/\\.png$/i, ".webp")}
            />
            <img
              src={item.curveImage}
              alt={`${item.name} equity curve`}
              className="absolute inset-0 h-full w-full object-contain p-2"
              loading="lazy"
              decoding="async"
            />
          </picture>
        ) : null}
        {!hasCurveImage ? (
          <svg
            viewBox="0 0 240 80"
            className="absolute bottom-0 left-0 h-24 w-full text-sky-400/70 md:h-28"
            fill="none"
            data-curve-id={item.curveId || item.id}
          >
            <path d={curvePath} stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : null}
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-50">
        {item.name}
        <span className="ml-2 text-xs font-medium text-slate-200/60">{item.period}</span>
      </div>
      <div className="mt-2 flex items-center gap-1" aria-label={`Rating ${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => {
          const active = index < rating;
          return (
            <svg
              key={`star-${item.id}-${index}`}
              viewBox="0 0 24 24"
              className={[
                "h-3.5 w-3.5",
                active ? "text-amber-300" : "text-slate-200/30"
              ].join(" ")}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 3.5l2.62 5.31 5.86.85-4.24 4.13 1 5.84L12 16.8l-5.24 2.83 1-5.84-4.24-4.13 5.86-.85L12 3.5z" />
            </svg>
          );
        })}
      </div>
      {item.review ? (
        <div className="mt-2 text-xs text-slate-200/70">{item.review}</div>
      ) : null}

      <p className="mt-3 text-sm leading-6 text-slate-200/70">{item.summary}</p>
    </Card>
  );
}

export const TestimonialsCarousel = memo(function TestimonialsCarousel({
  items
}: {
  items: TestimonialItem[];
}) {
  const reduceMotion = useReducedMotion();

  const rows = useMemo(() => {
    if (items.length <= 4) {
      return [items];
    }
    const rowCount = 3;
    const size = Math.ceil(items.length / rowCount);
    return Array.from({ length: rowCount }, (_, index) =>
      items.slice(index * size, (index + 1) * size)
    ).filter((row) => row.length > 0);
  }, [items]);

  if (reduceMotion || rows.length === 1) {
    return (
      <div className="space-y-6">
        {rows.map((row, index) => (
          <div
            key={`row-static-${index}`}
            className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {row.map((item) => (
              <TestimonialCard key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((row, index) => {
        const rowStyle = {
          "--marquee-duration": index === 0 ? "44s" : index === 1 ? "52s" : "48s"
        } as CSSProperties;
        const repeated = [...row, ...row];
        return (
          <div key={`row-${index}`} className="fx-marquee" style={rowStyle}>
            <div
              className={[
                "fx-marquee-track",
                index % 2 === 1 ? "fx-marquee-track-reverse" : ""
              ].join(" ")}
            >
              {repeated.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  aria-hidden={idx >= row.length}
                >
                  <TestimonialCard item={item} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
