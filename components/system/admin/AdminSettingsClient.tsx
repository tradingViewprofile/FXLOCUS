"use client";

import React from "react";

const READ_KEY = "fxlocus_desktop_package_read_version";

type DesktopMeta = {
  version: string;
  builtAt?: string;
};

export function AdminSettingsClient({ locale }: { locale: "zh" | "en" }) {
  const [desktopMeta, setDesktopMeta] = React.useState<DesktopMeta | null>(null);
  const [desktopMetaError, setDesktopMetaError] = React.useState(false);
  const [readVersion, setReadVersion] = React.useState<string | null>(null);

  const appVersion = String(process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(READ_KEY);
    setReadVersion(stored);
  }, []);

  React.useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const res = await fetch("/api/system/desktop/latest?json=1", { cache: "no-store" });
        if (!res.ok) throw new Error("meta_missing");
        const data = (await res.json()) as { ok?: boolean; version?: string; builtAt?: string };
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

  const needsPackage = desktopMetaError || !desktopMeta || desktopMeta.version !== appVersion;
  const isRead = readVersion === appVersion;
  const showBadge = needsPackage && !isRead;

  const markRead = () => {
    window.localStorage.setItem(READ_KEY, appVersion);
    setReadVersion(appVersion);
    window.dispatchEvent(new CustomEvent("fxdesktop:read", { detail: { version: appVersion } }));
  };

  const statusText = needsPackage
    ? locale === "zh"
      ? "需要重新打包并发布桌面端"
      : "Desktop build required"
    : locale === "zh"
      ? "桌面端已是最新版本"
      : "Desktop build is up to date";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-white/90 font-semibold text-xl">
        {locale === "zh" ? "系统设置" : "Settings"}
      </div>
      <div className="mt-2 text-white/60 text-sm">
        {locale === "zh"
          ? "在此查看桌面端版本状态，并检查关键环境变量。"
          : "Check desktop build status and key environment variables here."}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-white/85 font-semibold">
            {locale === "zh" ? "桌面端版本状态" : "Desktop build status"}
          </div>
          {showBadge ? (
            <span className="inline-flex items-center rounded-full bg-rose-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
              {locale === "zh" ? "待打包" : "Build required"}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 text-sm text-white/70">
          <div>
            {locale === "zh" ? "系统版本：" : "App version: "}
            <span className="text-white/90">{appVersion}</span>
          </div>
          <div>
            {locale === "zh" ? "安装包版本：" : "Installer version: "}
            <span className="text-white/90">{desktopMeta?.version || "-"}</span>
          </div>
          {desktopMeta?.builtAt ? (
            <div>
              {locale === "zh" ? "打包时间：" : "Built at: "}
              <span className="text-white/80">{desktopMeta.builtAt}</span>
            </div>
          ) : null}
          <div className={needsPackage ? "text-rose-300" : "text-emerald-300"}>{statusText}</div>
        </div>
        {needsPackage ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
              npm run desktop:package
            </code>
            <code className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
              npm run desktop:release
            </code>
            <button
              type="button"
              onClick={markRead}
              className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              {locale === "zh" ? "已阅" : "Mark as read"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 leading-7">
        <div className="text-white/85 font-semibold mb-2">
          {locale === "zh" ? "环境变量检查" : "Environment variables"}
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>SYSTEM_JWT_SECRET</li>
          <li>R2_ENDPOINT</li>
          <li>R2_ACCESS_KEY_ID</li>
          <li>R2_SECRET_ACCESS_KEY</li>
          <li>R2_BUCKET</li>
          <li>R2_PUBLIC_BASE_URL (optional)</li>
          <li>RESEND_API_KEY (optional)</li>
          <li>APP_BASE_URL (optional)</li>
        </ul>
      </div>
    </div>
  );
}
