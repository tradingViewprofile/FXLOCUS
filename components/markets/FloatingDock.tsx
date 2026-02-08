"use client";

import React from "react";

import type { MarketDockTabKey } from "./panels/MarketInfoDock";

type Props = {
  locale: "zh" | "en";
  containerRef: React.RefObject<HTMLElement>;
  activePanel: MarketDockTabKey | null;
  setActivePanel: (panel: MarketDockTabKey | null) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

function t(locale: "zh" | "en", zh: string, en: string) {
  return locale === "zh" ? zh : en;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function menuItemStyle(open: boolean, delayMs: number): React.CSSProperties {
  return {
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
    transition: `transform 220ms ease ${delayMs}ms, opacity 200ms ease ${delayMs}ms`,
    pointerEvents: open ? "auto" : "none"
  };
}

export function FloatingDock({
  locale,
  containerRef,
  activePanel,
  setActivePanel,
  isFullscreen,
  onToggleFullscreen
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 1600, y: 350 });
  const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
  const [menuSize, setMenuSize] = React.useState({ width: 180, height: 160 });

  const drag = React.useRef({ on: false, sx: 0, sy: 0, px: 0, py: 0, moved: false });
  const menuRef = React.useRef<HTMLDivElement>(null);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const width = rect.width || window.innerWidth || 0;
      const height = rect.height || window.innerHeight || 0;
      setContainerSize({ width, height });
      setPos((prev) => {
        const maxX = Math.max(8, width - 64);
        const maxY = Math.max(8, height - 64);
        if (!initialized.current && width > 0 && height > 0) {
          initialized.current = true;
          return {
            x: clamp(width - 120, 8, maxX),
            y: clamp(height / 2 - 28, 8, maxY)
          };
        }
        return {
          x: clamp(prev.x, 8, maxX),
          y: clamp(prev.y, 8, maxY)
        };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  React.useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.width && rect.height) {
      setMenuSize({ width: rect.width, height: rect.height });
    }
  }, [locale, isFullscreen, menuOpen]);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const el = containerRef.current;
    if (!el) return;
    drag.current.on = true;
    drag.current.moved = false;
    drag.current.sx = event.clientX;
    drag.current.sy = event.clientY;
    drag.current.px = pos.x;
    drag.current.py = pos.y;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.on) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const dx = event.clientX - drag.current.sx;
    const dy = event.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;

    const nextX = clamp(drag.current.px + dx, 8, rect.width - 64);
    const nextY = clamp(drag.current.py + dy, 8, rect.height - 64);
    setPos({ x: nextX, y: nextY });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.on) return;
    drag.current.on = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag.current.moved) {
      setMenuOpen((value) => !value);
    }
  };

  const selectPanel = (panel: MarketDockTabKey) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
    setMenuOpen(false);
  };

  const menuButton = (
    labelZh: string,
    labelEn: string,
    active: boolean,
    delayMs: number,
    onClick: () => void
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative rounded-full border border-white/15 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 px-4 py-2 text-xs font-semibold text-white/90 shadow-[0_0_18px_rgba(56,189,248,0.35)] backdrop-blur transition hover:border-sky-200/50 hover:text-white",
        active ? "border-sky-200/70 text-white shadow-[0_0_22px_rgba(56,189,248,0.6)]" : ""
      ].join(" ")}
      style={menuItemStyle(menuOpen, delayMs)}
    >
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.45),transparent_60%)] opacity-0 transition group-hover:opacity-100" />
      <span className="relative whitespace-nowrap">{t(locale, labelZh, labelEn)}</span>
    </button>
  );

  const immersiveButton = (delayMs: number) => (
    <button
      type="button"
      onClick={onToggleFullscreen}
      className={[
        "group relative rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-400/15 via-orange-400/20 to-rose-400/20 px-4 py-2 text-xs font-semibold text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)] backdrop-blur transition hover:border-amber-200/70 hover:text-white",
        isFullscreen ? "border-amber-200/80 text-white shadow-[0_0_24px_rgba(251,191,36,0.55)]" : ""
      ].join(" ")}
      style={menuItemStyle(menuOpen, delayMs)}
    >
      <span className="absolute inset-0 rounded-xl bg-[linear-gradient(120deg,rgba(251,191,36,0.18),rgba(249,115,22,0.15),rgba(244,63,94,0.18))] opacity-0 transition group-hover:opacity-100" />
      <span className="relative whitespace-nowrap">
        {isFullscreen
          ? t(locale, "退出沉浸模式", "Exit Immersive")
          : t(locale, "沉浸模式", "Immersive Mode")}
      </span>
    </button>
  );

  const buttonSize = 56;
  const gap = 12;
  const safePadding = 8;
  const menuLeftInContainer = (() => {
    if (!containerSize.width) return pos.x + buttonSize + gap;
    const rightSpace = containerSize.width - (pos.x + buttonSize);
    const fitsRight = rightSpace >= menuSize.width + gap;
    const fitsLeft = pos.x >= menuSize.width + gap;
    if (fitsRight) return pos.x + buttonSize + gap;
    if (fitsLeft) return pos.x - menuSize.width - gap;
    return clamp(pos.x + buttonSize + gap, safePadding, containerSize.width - menuSize.width - safePadding);
  })();
  const menuTopInContainer = (() => {
    if (!containerSize.height) return pos.y - buttonSize;
    const center = pos.y + buttonSize / 2;
    return clamp(
      center - menuSize.height / 2,
      safePadding,
      Math.max(safePadding, containerSize.height - menuSize.height - safePadding)
    );
  })();
  const menuOffsetLeft = menuLeftInContainer - pos.x;
  const menuOffsetTop = menuTopInContainer - pos.y;

  return (
    <div className="pointer-events-none absolute inset-0">
      <style>{`
        @keyframes fxlocus-rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="pointer-events-auto absolute" style={{ left: pos.x, top: pos.y }}>
        <div className="relative">
          <div
            ref={menuRef}
            className="absolute flex flex-col items-start gap-2"
            style={{
              left: menuOffsetLeft,
              top: menuOffsetTop,
              pointerEvents: menuOpen ? "auto" : "none"
            }}
          >
            {menuButton("FL视角", "FL View", activePanel === "ai", 0, () => selectPanel("ai"))}
            {menuButton("新闻", "News", activePanel === "news", 40, () => selectPanel("news"))}
            {immersiveButton(80)}
          </div>

          <button
            type="button"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/40 text-white shadow-[0_0_30px_rgba(56,189,248,0.7)] transition hover:scale-[1.04] active:scale-[0.98]"
            style={{
              backgroundImage:
                "linear-gradient(130deg, #f97316, #facc15, #22d3ee, #a855f7, #f472b6)",
              backgroundSize: "200% 200%",
              animation: "fxlocus-rainbow 6s ease infinite"
            }}
            title={t(locale, "点击展开/收起，按住拖动", "Click to toggle, drag to move")}
            aria-label={t(locale, "悬浮菜单", "Floating menu")}
          >
            <span className="absolute inset-[6px] rounded-full bg-black/25" />
            <span
              className="relative text-[11px] font-semibold tracking-[0.3em] text-white"
              style={{ textShadow: "0 1px 4px rgba(15, 23, 42, 0.7)" }}
            >
              FL
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
