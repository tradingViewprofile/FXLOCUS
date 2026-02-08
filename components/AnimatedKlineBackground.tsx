"use client";

import { useEffect, useRef } from "react";

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#02010a";
  ctx.fillRect(0, 0, w, h);

  // main blue glow around the logo area (center-right)
  const glow = ctx.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.6, h * 0.4, h * 0.7);
  glow.addColorStop(0, "rgba(37, 99, 235, 0.85)");
  glow.addColorStop(0.5, "rgba(37, 99, 235, 0.35)");
  glow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

interface Node {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  phase: number;
}

interface Ripple {
  x: number;
  y: number;
  startMs: number;
  durationMs: number;
  maxRadius: number;
}

function nodeDrift(n: Node, t: number) {
  return {
    x: n.x + Math.sin(t * 0.55 + n.phase) * 1.1,
    y: n.y + Math.cos(t * 0.48 + n.phase * 1.7) * 1.1
  };
}

function drawRipples(ctx: CanvasRenderingContext2D, ripples: Ripple[], nowMs: number) {
  if (ripples.length === 0) return;

  const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

  const next: Ripple[] = [];
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(59,130,246,0.28)";

  for (const r of ripples) {
    const ageMs = nowMs - r.startMs;
    if (ageMs < 0) {
      next.push(r);
      continue;
    }

    const p = ageMs / r.durationMs;
    if (p >= 1) continue;

    const minRadius = 4;
    const radius = minRadius + easeOutCubic(p) * (r.maxRadius - minRadius);

    // 立刻可见且逐渐衰减：p=0 alpha最大，p->1 alpha->0
    const alpha = (1 - p) * 0.18;
    ctx.lineWidth = 1.5 - p * 0.8;
    ctx.strokeStyle = `rgba(59,130,246,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    next.push(r);
  }

  ctx.restore();
  ripples.splice(0, ripples.length, ...next);
}

function drawNeural(ctx: CanvasRenderingContext2D, nodes: Node[], t: number, w: number, h: number) {
  const positions = nodes.map((n) => nodeDrift(n, t));

  ctx.lineWidth = 1.1;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = positions[i];
      const b = positions[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = w * 0.2;
      if (dist < maxDist) {
        const alpha = 0.32 - (dist / maxDist) * 0.32;
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const p = positions[i];
    const pulse = 0.4 + 0.3 * Math.sin(t * 2 + n.phase);
    const r = n.radius * (0.7 + pulse);
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    gradient.addColorStop(0, "rgba(59,130,246,0.95)");
    gradient.addColorStop(0.5, "rgba(59,130,246,0.4)");
    gradient.addColorStop(1, "rgba(59,130,246,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function AnimatedKlineBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Node[] | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const frameRef = useRef<number | null>(null);
  const runningRef = useRef(true);

  useEffect(() => {
    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl || typeof window === "undefined") return;

      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;

      const rect = canvasEl.parentElement?.getBoundingClientRect();
      const width = rect && rect.width > 0 ? rect.width : window.innerWidth;
      const height = rect && rect.height > 0 ? rect.height : window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nodes: Node[] = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        const x = width * (0.08 + Math.random() * 0.84);
        const y = height * (0.05 + Math.random() * 0.9);
        nodes.push({
          x,
          y,
          targetX: x,
          targetY: y,
          radius: 10 + Math.random() * 10,
          phase: Math.random() * Math.PI * 2
        });
      }
      nodesRef.current = nodes;
    }

    let start = performance.now();
    let lastNow = start;

    const canvasElInitial = canvasRef.current;
    if (!canvasElInitial || typeof window === "undefined") return;
    const ctx = canvasElInitial.getContext("2d");
    if (!ctx) return;

    resize();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const staticOnly = Boolean(reduceMotion || saveData);

    if (staticOnly) {
      const drawStatic = () => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        const w = canvasEl.clientWidth;
        const h = canvasEl.clientHeight;
        drawBackground(ctx, w, h);
        const nodes = nodesRef.current;
        if (nodes) {
          drawNeural(ctx, nodes, 0, w, h);
        }
      };
      drawStatic();
      const handleResize = () => {
        resize();
        drawStatic();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    window.addEventListener("resize", resize);

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest("a,button,input,textarea,select,[role='button']");
    };

    const handlePointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      if (isInteractiveTarget(ev.target)) return;

      const canvasEl = canvasRef.current;
      const nodes = nodesRef.current;
      if (!canvasEl || !nodes || nodes.length === 0) return;

      const rect = canvasEl.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const t = (performance.now() - start) / 1000;
      let nearestIdx = 0;
      let nearestDist2 = Number.POSITIVE_INFINITY;
      for (let i = 0; i < nodes.length; i++) {
        const p = nodeDrift(nodes[i], t);
        const dx = p.x - x;
        const dy = p.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestDist2) {
          nearestDist2 = d2;
          nearestIdx = i;
        }
      }

      const margin = 18;
      const targetX = Math.max(margin, Math.min(x, rect.width - margin));
      const targetY = Math.max(margin, Math.min(y, rect.height - margin));
      nodes[nearestIdx].targetX = targetX;
      nodes[nearestIdx].targetY = targetY;

      const nowMs = performance.now();

      // 点击产生 3 层小涟漪：缓慢一圈一圈扩散，最大半径不超过 50px
      ripplesRef.current.length = 0;

      const maxRadius = 50;
      const durationMs = 1400;
      const layers = 3;
      const delayMs = 180;

      for (let i = 0; i < layers; i++) {
        ripplesRef.current.push({
          x,
          y,
          startMs: nowMs + i * delayMs,
          durationMs,
          maxRadius
        });
      }

    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    const targetFps = 30;
    const frameInterval = 1000 / targetFps;
    let lastFrame = start;

    const render = (now: number) => {
      if (!runningRef.current) return;
      if (now - lastFrame < frameInterval) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrame = now;
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      const canvasEl = canvasRef.current;
      if (!canvasEl) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      const w = canvasEl.clientWidth;
      const h = canvasEl.clientHeight;
      if (w === 0 || h === 0) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      drawBackground(ctx, w, h);

      const nodes = nodesRef.current;
      if (nodes) {
        const tauSeconds = 1.1;
        const follow = 1 - Math.exp(-dt / tauSeconds);
        for (const n of nodes) {
          n.x += (n.targetX - n.x) * follow;
          n.y += (n.targetY - n.y) * follow;
        }
        drawNeural(ctx, nodes, t, w, h);
      }

      drawRipples(ctx, ripplesRef.current, now);

      frameRef.current = requestAnimationFrame(render);
    };

    const stop = () => {
      runningRef.current = false;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const startLoop = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastNow = performance.now();
      frameRef.current = requestAnimationFrame(render);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else startLoop();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!document.hidden) {
      runningRef.current = true;
      frameRef.current = requestAnimationFrame(render);
    } else {
      runningRef.current = false;
    }

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
