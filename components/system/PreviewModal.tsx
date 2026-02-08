"use client";

import React from "react";

type PreviewFile = {
  name: string;
  url?: string | null;
  mimeType?: string | null;
};

type PreviewModalProps = {
  file: PreviewFile | null;
  locale: "zh" | "en";
  onClose: () => void;
};

function previewKind(file: PreviewFile) {
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.mimeType || "").toLowerCase();
  if (
    mime.startsWith("image/") ||
    mime === "image" ||
    mime.includes("image") ||
    /\.(png|jpe?g|gif|webp)$/.test(name)
  ) {
    return "image";
  }
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("text/") || name.endsWith(".txt")) return "text";
  if (/\.(docx?|xlsx?)$/.test(name)) return "office";
  if (mime.includes("msword") || mime.includes("officedocument") || mime.includes("excel")) return "office";
  return "other";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PreviewModal({ file, locale, onClose }: PreviewModalProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0
  });
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [text, setText] = React.useState("");
  const [loadingText, setLoadingText] = React.useState(false);
  const [textError, setTextError] = React.useState<string | null>(null);

  const kind = file ? previewKind(file) : "other";
  const url = file?.url || null;

  const resetTransform = React.useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    if (!file) return;
    resetTransform();
    setText("");
    setTextError(null);
    if (previewKind(file) !== "text" || !file.url) {
      setLoadingText(false);
      return;
    }
    const controller = new AbortController();
    setLoadingText(true);
    fetch(file.url, { signal: controller.signal })
      .then((res) => res.text())
      .then((data) => setText(data))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setTextError(locale === "zh" ? "预览失败" : "Preview failed");
      })
      .finally(() => setLoadingText(false));
    return () => controller.abort();
  }, [file, locale, resetTransform]);

  if (!file) return null;

  const handleFullScreen = () => {
    if (!containerRef.current?.requestFullscreen) return;
    void containerRef.current.requestFullscreen().catch(() => {});
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (kind !== "image") return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (kind !== "image" || !dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (kind !== "image") return;
    dragRef.current.active = false;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (kind !== "image") return;
    event.preventDefault();
    const step = event.deltaY > 0 ? -0.12 : 0.12;
    setScale((s) => clamp(s + step, 0.4, 4));
  };

  const zoomIn = () => setScale((s) => clamp(s + 0.15, 0.4, 4));
  const zoomOut = () => setScale((s) => clamp(s - 0.15, 0.4, 4));
  const rotateLeft = () => setRotation((r) => (r - 90) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog">
      <div ref={containerRef} className="w-full max-w-[1000px] rounded-3xl border border-white/10 bg-[#050a14] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-white/85 font-semibold">
            {locale === "zh" ? "预览" : "Preview"} · {file.name}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {kind === "image" ? (
              <>
                <button
                  type="button"
                  onClick={zoomOut}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                >
                  {locale === "zh" ? "缩小" : "Zoom out"}
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                >
                  {locale === "zh" ? "放大" : "Zoom in"}
                </button>
                <button
                  type="button"
                  onClick={rotateLeft}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                >
                  {locale === "zh" ? "左转" : "Rotate left"}
                </button>
                <button
                  type="button"
                  onClick={rotateRight}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                >
                  {locale === "zh" ? "右转" : "Rotate right"}
                </button>
                <button
                  type="button"
                  onClick={resetTransform}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
                >
                  {locale === "zh" ? "重置" : "Reset"}
                </button>
              </>
            ) : null}
            {url ? (
              <button
                type="button"
                onClick={handleFullScreen}
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "全屏" : "Full screen"}
              </button>
            ) : null}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "zh" ? "打开文件" : "Open"}
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
            >
              {locale === "zh" ? "关闭" : "Close"}
            </button>
          </div>
        </div>

        <div
          className="mt-4 h-[72vh] w-full rounded-2xl border border-white/10 bg-black/40 overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          style={{ touchAction: kind === "image" ? "none" : "auto" }}
        >
          {url ? (
            kind === "image" ? (
              <div className="h-full w-full flex items-center justify-center">
                <img
                  src={url}
                  alt={file.name}
                  className="max-h-full max-w-full select-none"
                  draggable={false}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                    transition: dragging ? "none" : "transform 120ms ease-out"
                  }}
                />
              </div>
            ) : kind === "pdf" ? (
              <iframe title={file.name} src={url} className="h-full w-full" allowFullScreen />
            ) : kind === "text" ? (
              <div className="h-full w-full overflow-auto p-4 text-sm text-white/80 whitespace-pre-wrap">
                {loadingText
                  ? locale === "zh"
                    ? "加载中..."
                    : "Loading..."
                  : textError
                    ? textError
                    : text || (locale === "zh" ? "暂无内容" : "Empty")}
              </div>
            ) : kind === "office" ? (
              <iframe
                title={file.name}
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                className="h-full w-full"
                allowFullScreen
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-white/70 text-sm gap-3">
                <div>{locale === "zh" ? "当前格式暂不支持预览" : "Preview not available for this file type."}</div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15"
                >
                  {locale === "zh" ? "打开文件" : "Open file"}
                </a>
              </div>
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white/60 text-sm">
              {locale === "zh" ? "无法预览该文件" : "Cannot preview this file."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
