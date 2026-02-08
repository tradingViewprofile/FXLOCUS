"use client";

import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AnimatedKlineBackground } from "@/components/AnimatedKlineBackground";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { stripLocale } from "@/lib/i18n/withLocale";

type Props = {
  children: ReactNode;
  locale: "zh" | "en";
};

function isSystemAuthPath(pathname: string) {
  return (
    pathname.includes("/system/login") ||
    pathname.includes("/system/forgot-password") ||
    pathname.includes("/system/reset-password")
  );
}

export function SiteShell({ children }: Props) {
  const pathname = usePathname() || "";
  const windowPath = typeof window !== "undefined" ? window.location.pathname || "" : "";
  const currentPath = pathname || windowPath;
  const normalizedPath = stripLocale(currentPath || "/");
  const trimmedPath =
    normalizedPath === "/" ? "/" : normalizedPath.replace(/\/+$/, "") || "/";
  const systemPath = currentPath.includes("/system");
  const authPath = isSystemAuthPath(currentPath);
  const authRoute = authPath;
  const systemRoute = systemPath && !authPath;
  const systemActive = systemRoute;
  const newsRoute = trimmedPath === "/news";
  const desktopFlag =
    typeof window !== "undefined" && Boolean((window as any).fxlocusDesktop?.isDesktop);
  const uaFlag =
    typeof navigator !== "undefined" && /Fxlocus Desktop/i.test(navigator.userAgent || "");
  const desktopMode = desktopFlag || uaFlag;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    if (systemActive) {
      root.dataset.systemRoute = "1";
      body.dataset.systemRoute = "1";
      root.classList.add("system-mode");
      body.classList.add("system-mode");
    } else {
      root.removeAttribute("data-system-route");
      body.removeAttribute("data-system-route");
      root.classList.remove("system-mode");
      body.classList.remove("system-mode");
    }
  }, [systemActive]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const root = document.documentElement;
    if (newsRoute) {
      body.classList.add("news-mode");
      root.classList.add("news-mode");
    } else {
      body.classList.remove("news-mode");
      root.classList.remove("news-mode");
    }
  }, [newsRoute]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    if (desktopMode) {
      root.setAttribute("data-desktop", "1");
      body?.setAttribute("data-desktop", "1");
    } else {
      root.removeAttribute("data-desktop");
      body?.removeAttribute("data-desktop");
    }
    if (authPath) {
      root.setAttribute("data-system-auth", "1");
      body?.setAttribute("data-system-auth", "1");
    } else {
      root.removeAttribute("data-system-auth");
      body?.removeAttribute("data-system-auth");
    }
  }, [authPath, desktopMode]);

  return (
    <div className={newsRoute ? "h-[100dvh] overflow-hidden" : "min-h-screen"}>
      {!systemRoute ? (
        <div className="site-shell-bg pointer-events-none fixed inset-0 -z-50">
          <AnimatedKlineBackground />
        </div>
      ) : null}

      {!systemRoute ? <SiteHeader /> : null}
      <main
        className={
          systemRoute
            ? "min-h-screen"
            : authRoute
              ? "min-h-screen w-full px-0 pt-0 pb-0"
            : newsRoute
              ? "flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden px-0 pt-0 pb-0"
              : "fx-container pb-20 pt-12"
        }
      >
        <div
          className={
            systemRoute
              ? undefined
              : authRoute
                ? "fx-page w-full"
              : newsRoute
                ? "fx-page flex h-full min-h-0 flex-col"
                : "fx-page"
          }
          key={`${trimmedPath}-${newsRoute ? "news" : "main"}`}
        >
          {children}
        </div>
      </main>
      {!systemRoute && !newsRoute ? <SiteFooter /> : null}
    </div>
  );
}
