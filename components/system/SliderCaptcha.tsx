"use client";

import React from "react";
import { createPortal } from "react-dom";

type Props = {
  locale: "zh" | "en";
  onChange: (ok: boolean) => void;
  disabled?: boolean;
  resetSignal?: string | number;
};

type Puzzle = {
  width: number;
  height: number;
  piece: number;
  tab: number;
  outer: number;
  tabs: { top: number; right: number; bottom: number; left: number };
  corner: number;
  waves: { top: number[]; right: number[]; bottom: number[]; left: number[] };
  gapX: number;
  gapY: number;
  bgUrl: string;
  pieceUrl: string;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function drawWavyEdge(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  nx: number,
  ny: number,
  waves: number[]
) {
  const segments = waves.length + 1;
  for (let i = 0; i < waves.length; i += 1) {
    const tMid = (i + 0.5) / segments;
    const tEnd = (i + 1) / segments;
    const cx = sx + (ex - sx) * tMid + nx * waves[i];
    const cy = sy + (ey - sy) * tMid + ny * waves[i];
    const x = sx + (ex - sx) * tEnd;
    const y = sy + (ey - sy) * tEnd;
    ctx.quadraticCurveTo(cx, cy, x, y);
  }
  ctx.lineTo(ex, ey);
}

function drawPuzzlePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tab: number,
  tabs: { top: number; right: number; bottom: number; left: number },
  corner: number,
  waves: { top: number[]; right: number[]; bottom: number[]; left: number[] }
) {
  const s = size;
  const t = tab;
  const r = t / 2;
  const c = Math.max(4, Math.min(corner, s / 4));

  const topStart = x + c;
  const topTabStart = x + s * 0.5 - r;
  const topTabEnd = x + s * 0.5 + r;

  const rightStart = y + c;
  const rightTabStart = y + s * 0.5 - r;
  const rightTabEnd = y + s * 0.5 + r;

  const bottomStart = x + s - c;
  const bottomTabStart = x + s * 0.5 + r;
  const bottomTabEnd = x + s * 0.5 - r;

  const leftStart = y + s - c;
  const leftTabStart = y + s * 0.5 + r;
  const leftTabEnd = y + s * 0.5 - r;

  ctx.beginPath();
  ctx.moveTo(topStart, y);
  drawWavyEdge(ctx, topStart, y, topTabStart, y, 0, -1, waves.top);
  ctx.arc(
    x + s * 0.5,
    y + (tabs.top === 1 ? -r : r),
    r,
    Math.PI,
    0,
    tabs.top !== 1
  );
  drawWavyEdge(ctx, topTabEnd, y, x + s - c, y, 0, -1, waves.top);
  ctx.arcTo(x + s, y, x + s, y + c, c);

  drawWavyEdge(ctx, x + s, rightStart, x + s, rightTabStart, 1, 0, waves.right);
  ctx.arc(
    x + s + (tabs.right === 1 ? r : -r),
    y + s * 0.5,
    r,
    -Math.PI / 2,
    Math.PI / 2,
    tabs.right !== 1
  );
  drawWavyEdge(ctx, x + s, rightTabEnd, x + s, y + s - c, 1, 0, waves.right);
  ctx.arcTo(x + s, y + s, x + s - c, y + s, c);

  drawWavyEdge(ctx, bottomStart, y + s, bottomTabStart, y + s, 0, 1, waves.bottom);
  ctx.arc(
    x + s * 0.5,
    y + s + (tabs.bottom === 1 ? r : -r),
    r,
    0,
    Math.PI,
    tabs.bottom !== 1
  );
  drawWavyEdge(ctx, bottomTabEnd, y + s, x + c, y + s, 0, 1, waves.bottom);
  ctx.arcTo(x, y + s, x, y + s - c, c);

  drawWavyEdge(ctx, x, leftStart, x, leftTabStart, -1, 0, waves.left);
  ctx.arc(
    x + (tabs.left === 1 ? -r : r),
    y + s * 0.5,
    r,
    Math.PI / 2,
    -Math.PI / 2,
    tabs.left !== 1
  );
  drawWavyEdge(ctx, x, leftTabEnd, x, y + c, -1, 0, waves.left);
  ctx.arcTo(x, y, x + c, y, c);
  ctx.closePath();
}

function generatePuzzle(): Puzzle {
  const width = 340;
  const height = 180;
  const piece = 60;
  const tab = 18;
  const outer = piece + tab * 2;

  const minX = tab + 16;
  const maxX = width - piece - tab - 16;
  const minY = tab + 12;
  const maxY = height - piece - tab - 12;
  const gapX = randInt(minX, Math.max(minX + 1, maxX));
  const gapY = randInt(minY, Math.max(minY + 1, maxY));

  const tabs = {
    top: randInt(0, 1) ? 1 : -1,
    right: randInt(0, 1) ? 1 : -1,
    bottom: randInt(0, 1) ? 1 : -1,
    left: randInt(0, 1) ? 1 : -1
  };
  const corner = randInt(6, 12);
  const wave = () => [randInt(-5, 6), randInt(-6, 7)];
  const waves = {
    top: wave(),
    right: wave(),
    bottom: wave(),
    left: wave()
  };

  const bg = document.createElement("canvas");
  bg.width = width;
  bg.height = height;
  const ctx = bg.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, `hsl(${randInt(200, 215)} 80% 55%)`);
  g.addColorStop(0.55, `hsl(${randInt(215, 235)} 75% 50%)`);
  g.addColorStop(1, `hsl(${randInt(225, 250)} 70% 42%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 14; i += 1) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = `hsl(${randInt(190, 255)} 90% ${randInt(45, 70)}%)`;
    ctx.beginPath();
    ctx.arc(randInt(0, width), randInt(0, height), randInt(12, 56), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < 10; i += 1) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = `rgba(255,255,255,${randInt(8, 22) / 100})`;
    ctx.lineWidth = randInt(1, 3);
    ctx.beginPath();
    ctx.moveTo(randInt(0, width), randInt(0, height));
    ctx.lineTo(randInt(0, width), randInt(0, height));
    ctx.stroke();
    ctx.restore();
  }

  const pieceCanvas = document.createElement("canvas");
  pieceCanvas.width = outer;
  pieceCanvas.height = outer;
  const pctx = pieceCanvas.getContext("2d");
  if (!pctx) throw new Error("CANVAS_UNAVAILABLE");
  pctx.save();
  pctx.lineJoin = "round";
  pctx.lineCap = "round";
  drawPuzzlePath(pctx, tab, tab, piece, tab, tabs, corner, waves);
  pctx.clip();
  pctx.drawImage(bg, gapX - tab, gapY - tab, outer, outer, 0, 0, outer, outer);
  pctx.globalCompositeOperation = "source-atop";
  const gloss = pctx.createLinearGradient(0, 0, outer, outer);
  gloss.addColorStop(0, "rgba(255,255,255,0.32)");
  gloss.addColorStop(0.5, "rgba(255,255,255,0.08)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  pctx.fillStyle = gloss;
  pctx.fillRect(0, 0, outer, outer);
  pctx.restore();
  pctx.save();
  pctx.lineJoin = "round";
  pctx.lineCap = "round";
  drawPuzzlePath(pctx, tab, tab, piece, tab, tabs, corner, waves);
  pctx.strokeStyle = "rgba(255,255,255,0.7)";
  pctx.lineWidth = 2;
  pctx.stroke();
  pctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  drawPuzzlePath(ctx, gapX, gapY, piece, tab, tabs, corner, waves);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  drawPuzzlePath(ctx, gapX, gapY, piece, tab, tabs, corner, waves);
  ctx.stroke();
  ctx.restore();

  return {
    width,
    height,
    piece,
    tab,
    outer,
    tabs,
    corner,
    waves,
    gapX,
    gapY,
    bgUrl: bg.toDataURL("image/png"),
    pieceUrl: pieceCanvas.toDataURL("image/png")
  };
}

export function SliderCaptcha({ locale, onChange, disabled, resetSignal }: Props) {
  const boxRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const knobRef = React.useRef<HTMLButtonElement | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const [open, setOpen] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [puzzle, setPuzzle] = React.useState<Puzzle | null>(null);
  const [scale, setScale] = React.useState(1);
  const [maxKnob, setMaxKnob] = React.useState(0);
  const [knobWidth, setKnobWidth] = React.useState(44);
  const [dragging, setDragging] = React.useState(false);
  const [knobOffset, setKnobOffset] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [portalReady, setPortalReady] = React.useState(false);

  const startX = React.useRef(0);
  const startOffset = React.useRef(0);

  React.useEffect(() => {
    onChange(verified);
  }, [onChange, verified]);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
    setVerified(false);
    setPuzzle(null);
    setKnobOffset(0);
    setDragging(false);
    setError(null);
  }, [resetSignal]);

  const refreshLayout = React.useCallback(() => {
    if (!puzzle) return;

    const box = boxRef.current;
    if (box) {
      const w = box.getBoundingClientRect().width;
      setScale(w > 0 ? w / puzzle.width : 1);
    }

    const track = trackRef.current;
    const knob = knobRef.current;
    if (track && knob) {
      const trackWidth = track.getBoundingClientRect().width;
      const kWidth = knob.getBoundingClientRect().width;
      const max = Math.max(0, trackWidth - kWidth - 6);
      setKnobWidth(kWidth);
      setMaxKnob(max);
      setKnobOffset((prev) => clamp(prev, 0, max));
    }
  }, [puzzle]);

  React.useEffect(() => {
    if (!open || !puzzle) return;
    refreshLayout();

    const ro = new ResizeObserver(() => refreshLayout());
    if (boxRef.current) ro.observe(boxRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, [open, puzzle, refreshLayout]);

  const reset = React.useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVerified(false);
    setOpen(false);
    setPuzzle(null);
    setKnobOffset(0);
    setDragging(false);
    setError(null);
  }, []);

  const openPuzzle = () => {
    if (verified || disabled) return;
    setOpen(true);
    setError(null);
    setKnobOffset(0);
    setDragging(false);
    setPuzzle(generatePuzzle());
  };

  const regenerate = () => {
    if (verified) return;
    setError(null);
    setKnobOffset(0);
    setDragging(false);
    setPuzzle(generatePuzzle());
  };

  const maxPiece = puzzle
    ? Math.max(0, puzzle.width - puzzle.piece - puzzle.tab * 2)
    : 0;
  const pieceLeft = puzzle && maxKnob > 0 ? (maxPiece * knobOffset) / maxKnob : 0;
  const pieceBaseX = puzzle ? pieceLeft + puzzle.tab : 0;
  const tolerance = 6;

  const finishOk = React.useCallback(() => {
    if (!puzzle) return;
    const targetLeft = clamp(puzzle.gapX - puzzle.tab, 0, maxPiece);
    const targetKnob = maxPiece > 0 && maxKnob > 0 ? (targetLeft / maxPiece) * maxKnob : 0;
    setKnobOffset(clamp(targetKnob, 0, maxKnob));
    setVerified(true);
    setDragging(false);
    timerRef.current = window.setTimeout(() => {
      setOpen(false);
      timerRef.current = null;
    }, 320);
  }, [maxKnob, maxPiece, puzzle]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!open || verified || !puzzle || disabled) return;
    setError(null);
    setDragging(true);
    startX.current = e.clientX;
    startOffset.current = knobOffset;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || verified || !open) return;
    const next = clamp(startOffset.current + (e.clientX - startX.current), 0, maxKnob);
    setKnobOffset(next);
  };

  const onPointerUp = () => {
  if (!dragging || verified || !puzzle) return;
  setDragging(false);

  const pass = Math.abs(pieceBaseX - puzzle.gapX) <= tolerance && knobOffset > 6;
  if (pass) {
    finishOk();
    return;
  }

  setError(locale === "zh" ? "未对齐，请重试。" : "Not aligned. Try again.");
  setKnobOffset(0);
};

  const titleText = locale === "zh" ? "安全验证" : "Security check";
  const statusText = verified
    ? locale === "zh"
      ? "验证通过"
      : "Verified"
    : disabled
      ? locale === "zh"
        ? "请先选择账号类型并填写账号密码"
        : "Fill account type, email and password first"
      : locale === "zh"
        ? "点击开始图形验证"
        : "Click to start verification";

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 text-[color:var(--text)] shadow-[0_12px_36px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)]">{titleText}</div>
          <div className="mt-1 text-sm text-[color:var(--text-secondary)]">{statusText}</div>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!verified}
          className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-white/5 disabled:opacity-40"
        >
          {locale === "zh" ? "重置" : "Reset"}
        </button>
      </div>

      <button
        type="button"
        onClick={openPuzzle}
        disabled={disabled || verified}
        className={[
          "mt-4 w-full rounded-2xl border px-4 py-3 text-sm transition-colors text-left backdrop-blur",
          verified
            ? "bg-white/10 border-white/20 text-[color:var(--text)] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            : disabled
              ? "bg-white/5 border-[color:var(--border)] text-[color:var(--text-muted)] cursor-not-allowed"
              : "bg-white/10 border-[color:var(--border-2)] text-[color:var(--text)] hover:bg-white/15 shadow-[0_10px_24px_rgba(0,0,0,0.15)]"
        ].join(" ")}
      >
        {verified
          ? locale === "zh"
            ? "验证通过 ✓"
            : "Verified ✓"
          : locale === "zh"
            ? "点击进行图形拖动验证"
            : "Click to verify"}
      </button>

      {portalReady && open
        ? createPortal(
          <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 pointer-events-auto isolation-isolate"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: "var(--bg-1)",
                mixBlendMode: "normal"
              }}
            />
            <div
              className={[
                "relative w-full max-w-[480px] rounded-[28px] border border-[color:var(--border-2)] p-6 text-[color:var(--text)] shadow-[0_30px_80px_rgba(0,0,0,0.65)]",
                verified ? "captcha-pop" : "",
                error ? "captcha-shake" : ""
              ].join(" ")}
              style={{
                backgroundColor: "var(--bg-1)",
                backgroundImage:
                  "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.08), transparent 45%), linear-gradient(160deg, var(--bg-1), var(--bg))"
              }}
            >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text-secondary)]">
                ✓
              </div>
              <div>
                <div className="text-base font-semibold text-[color:var(--text)]">
                  {locale === "zh" ? "图形拖动验证" : "Drag verification"}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-[color:var(--text-muted)]">
                  {locale === "zh" ? "快速安全校验" : "Quick secure check"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] px-3 py-1.5 text-xs text-[color:var(--text-secondary)] hover:bg-white/10"
              >
                {locale === "zh" ? "关闭" : "Close"}
              </button>
            </div>

            <div className="mt-4 text-xs text-[color:var(--text-secondary)] leading-5">
              {locale === "zh"
                ? "拖动下方滑块，让拼图块对齐上方缺口。"
                : "Drag the slider to align the piece with the gap."}
            </div>

            <div className="mt-4 space-y-4">
              <div
                ref={boxRef}
                className="relative mx-auto w-full max-w-[380px] aspect-[2/1] rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-1)] overflow-hidden"
              >
                {puzzle ? (
                  <>
                    {/* background */}
                    <img
                      src={puzzle.bgUrl}
                      alt="captcha"
                      className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_45%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.12),transparent_60%)]" />

                    {/* movable piece */}
                    <img
                      src={puzzle.pieceUrl}
                      alt="piece"
                      className="absolute rounded-lg shadow-xl select-none pointer-events-none"
                      style={{
                        left: `${pieceLeft * scale}px`,
                        top: `${(puzzle.gapY - puzzle.tab) * scale}px`,
                        width: `${puzzle.outer * scale}px`,
                        height: `${puzzle.outer * scale}px`
                      }}
                      draggable={false}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[color:var(--text-secondary)] text-sm">
                    {locale === "zh" ? "生成中…" : "Generating…"}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4 space-y-4">
                <div
                  ref={trackRef}
                  className="relative h-12 rounded-2xl bg-[color:var(--bg)] border border-[color:var(--border)] overflow-hidden touch-none shadow-inner"
                  style={{ touchAction: "none" }}
                >
                  <div
                    className={[
                      "absolute inset-0 rounded-2xl pointer-events-none",
                      verified ? "captcha-sweep" : "",
                      error ? "captcha-error" : ""
                    ].join(" ")}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-2xl transition-colors"
                    style={{
                      width: `${Math.max(0, knobOffset + knobWidth)}px`,
                      background: verified
                        ? "linear-gradient(90deg, var(--accent), rgba(255,255,255,0.12))"
                        : "rgba(255,255,255,0.1)"
                    }}
                  />

                  <button
                    ref={knobRef}
                    type="button"
                    disabled={verified}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onPointerDownCapture={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    className={[
                      "absolute top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl border touch-none shadow-[0_10px_20px_rgba(0,0,0,0.3)]",
                      verified
                        ? "border-[color:var(--accent)] text-[color:var(--text)] cursor-default"
                        : "bg-gradient-to-br from-white/20 via-white/10 to-white/5 border-[color:var(--border-2)] text-[color:var(--text)] cursor-grab active:cursor-grabbing"
                    ].join(" ")}
                    style={{
                      left: `${knobOffset}px`,
                      touchAction: "none",
                      background: verified
                        ? "linear-gradient(135deg, var(--accent), rgba(255,255,255,0.18))"
                        : undefined,
                      boxShadow: verified
                        ? "0 10px 24px rgba(0,0,0,0.35), 0 0 18px var(--accent)"
                        : undefined
                    }}
                    aria-label={locale === "zh" ? "拖动滑块" : "Drag slider"}
                  >
                    {verified ? "✓" : "→"}
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-[color:var(--text-muted)] pointer-events-none select-none">
                    {verified ? (locale === "zh" ? "验证通过" : "Passed") : locale === "zh" ? "向右拖动" : "Slide right"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={regenerate}
                    disabled={verified}
                    className="px-3 py-1.5 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--panel-3)] disabled:opacity-50"
                  >
                    {locale === "zh" ? "换一张" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="ml-auto px-3 py-1.5 rounded-xl bg-[color:var(--bg)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--panel-3)]"
                  >
                    {locale === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </div>,
          document.body
        )
        : null}

      <style jsx global>{`
        @keyframes captchaShake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-6px, 0, 0); }
          40% { transform: translate3d(6px, 0, 0); }
          60% { transform: translate3d(-4px, 0, 0); }
          80% { transform: translate3d(4px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes captchaPop {
          0% { transform: scale(0.98); opacity: 0.9; }
          60% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes captchaSweep {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 0.6; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes captchaPulse {
          0% { box-shadow: 0 0 0 0 rgba(248,113,113,0.5); border-color: rgba(248,113,113,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(248,113,113,0); border-color: rgba(248,113,113,0.9); }
          100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); border-color: rgba(248,113,113,0.6); }
        }
        .captcha-shake {
          animation: captchaShake 420ms ease-in-out;
        }
        .captcha-pop {
          animation: captchaPop 360ms ease-out;
        }
        .captcha-sweep::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.3) 40%, transparent 70%);
          animation: captchaSweep 900ms ease-in-out;
        }
        .captcha-error {
          border: 1px solid rgba(248,113,113,0.6);
          animation: captchaPulse 720ms ease-out;
        }
      `}</style>
    </div>
  );
}
