import React from "react";
import Script from "next/script";
import { cookies } from "next/headers";

import { SystemShell } from "@/components/system/SystemShell";
import { isSystemTheme } from "@/lib/system/themes";

const SYSTEM_BOOTSTRAP = `(() => {
  try {
    const path = window.location.pathname || "";
    const isSystem = path.includes("/system");
    const isAuth =
      path.includes("/system/login") ||
      path.includes("/system/forgot-password") ||
      path.includes("/system/reset-password");
    if (!isSystem || isAuth) return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("system-mode");
    body.classList.add("system-mode");
    root.dataset.systemRoute = "1";
    body.dataset.systemRoute = "1";
    const cookieMatch = document.cookie
      ? document.cookie.match(/(?:^|; )system\\.theme=([^;]+)/)
      : null;
    const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    const theme =
      cookieTheme ||
      (window.localStorage ? window.localStorage.getItem("system.theme") : null) ||
      "ember";
    root.dataset.theme = theme;
    body.dataset.theme = theme;
  } catch {}
})();`;

export default function SystemLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: "zh" | "en" };
}) {
  const locale = params.locale === "en" ? "en" : "zh";
  const cookieTheme = cookies().get("system.theme")?.value;
  const initialTheme = cookieTheme && isSystemTheme(cookieTheme) ? cookieTheme : "ember";
  return (
    <>
      <Script id="system-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: SYSTEM_BOOTSTRAP }} />
      <SystemShell locale={locale} initialTheme={initialTheme}>
        {children}
      </SystemShell>
    </>
  );
}
