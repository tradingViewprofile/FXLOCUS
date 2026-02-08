"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Maximize2, Minimize2, Music, Palette } from "lucide-react";

import { systemThemes } from "@/lib/system/themes";
import { useSystemShell } from "./SystemShell";

type MenuItem = {
  key: string;
  zh: string;
  en: string;
};

function swapLocale(pathname: string, nextLocale: "zh" | "en") {
  return pathname.replace(/^\/(zh|en)(?=\/|$)/, `/${nextLocale}`);
}

function DropdownMenu({
  locale,
  label,
  icon: Icon,
  items,
  value,
  onChange
}: {
  locale: "zh" | "en";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ReadonlyArray<MenuItem>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-1.5 text-sm text-white/80 hover:bg-[color:var(--panel-2)]"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 text-white/70" />
        <span>{label}</span>
        <ChevronDown className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-2 shadow-2xl backdrop-blur">
          {items.map((item) => {
            const active = item.key === value;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onChange(item.key);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                  active ? "bg-[color:var(--panel-2)] text-white" : "text-white/70 hover:bg-[color:var(--panel)]"
                ].join(" ")}
              >
                <span>{locale === "zh" ? item.zh : item.en}</span>
                {active ? (
                  <span className="text-[11px] text-sky-200" aria-hidden="true">
                    OK
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SystemTopRightControls({ locale }: { locale: "zh" | "en" }) {
  const router = useRouter();
  const pathname = usePathname() || `/${locale}/system/dashboard`;
  const { isFullscreen, toggleFullscreen, theme, setTheme } = useSystemShell();
  const [musicOpen, setMusicOpen] = React.useState(false);
  const [desktopMeta, setDesktopMeta] = React.useState<{ version: string; builtAt?: string } | null>(null);
  const [desktopMetaError, setDesktopMetaError] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);
  const activeTheme = systemThemes.find((item) => item.key === theme);
  const themeLabel = activeTheme ? (locale === "zh" ? activeTheme.zh : activeTheme.en) : null;

  const toLocale = (nextLocale: "zh" | "en") => {
    router.replace(swapLocale(pathname, nextLocale));
  };

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (typeof detail?.open === "boolean") setMusicOpen(detail.open);
    };
    window.addEventListener("fxmusic:state", handler as EventListener);
    return () => window.removeEventListener("fxmusic:state", handler as EventListener);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const desktopFlag = Boolean((window as any).fxlocusDesktop?.isDesktop);
    const uaFlag = typeof navigator !== "undefined" && navigator.userAgent.includes("Fxlocus Desktop");
    setIsDesktop(desktopFlag || uaFlag);
  }, []);

  React.useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const res = await fetch("/api/system/desktop/latest?json=1", { cache: "no-store" });
        if (!res.ok) throw new Error("meta_missing");
        const data = (await res.json()) as { ok?: boolean; version?: string; builtAt?: string; downloadUrl?: string };
        if (!active) return;
        if (data?.ok && data?.version) {
          setDesktopMeta({ version: String(data.version), builtAt: data.builtAt });
          setDesktopMetaError(false);
        } else {
          setDesktopMeta(null);
          setDesktopMetaError(true);
        }
      } catch {
        if (!active) return;
        setDesktopMeta(null);
        setDesktopMetaError(true);
      }
    };
    loadMeta();
    return () => {
      active = false;
    };
  }, []);

  const toggleMusic = () => {
    const toggler = (window as any).__fxMusicToggle;
    if (typeof toggler === "function") toggler();
  };

  const appVersion = String(process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0");
  void appVersion;
  void desktopMetaError;

  return (
    <div className="flex items-center gap-2">
      {!isDesktop ? (
        <div className="relative">
          <a
            href="/api/system/desktop/latest"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 text-sm text-white/80 hover:bg-[color:var(--panel-2)]"
            aria-label={locale === "zh" ? "下载桌面端" : "Download desktop app"}
          >
            {locale === "zh" ? "下载桌面端" : "Download Desktop"}
          </a>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleFullscreen}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-white/80 hover:bg-[color:var(--panel-2)]"
        title={
          locale === "zh"
            ? isFullscreen
              ? "退出全屏"
              : "进入全屏"
            : isFullscreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
        }
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={toggleMusic}
        className={[
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-[color:var(--panel)] text-white/80 hover:bg-[color:var(--panel-2)]",
          musicOpen ? "border-[color:var(--accent)] text-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent)]" : "border-[color:var(--border)]"
        ].join(" ")}
        title={locale === "zh" ? "音乐" : "Music"}
        aria-label={locale === "zh" ? "音乐" : "Music"}
      >
        <Music className="h-4 w-4" />
      </button>

      <DropdownMenu
        locale={locale}
        label={
          themeLabel
            ? locale === "zh"
              ? `主题 · ${themeLabel}`
              : `Theme · ${themeLabel}`
            : locale === "zh"
              ? "主题"
              : "Theme"
        }
        icon={Palette}
        items={systemThemes}
        value={theme}
        onChange={(next) => setTheme(next as typeof theme)}
      />

      <div className="flex items-center rounded-xl border border-[color:var(--border)] bg-transparent overflow-hidden">
        <button
          type="button"
          onClick={() => toLocale("zh")}
          className={`px-3 py-1.5 text-sm ${
            locale === "zh"
              ? "bg-[color:var(--panel-2)] text-white"
              : "text-white/70 hover:bg-[color:var(--panel)]"
          }`}
        >
          中文
        </button>
        <button
          type="button"
          onClick={() => toLocale("en")}
          className={`px-3 py-1.5 text-sm ${
            locale === "en"
              ? "bg-[color:var(--panel-2)] text-white"
              : "text-white/70 hover:bg-[color:var(--panel)]"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}
