"use client";

import React from "react";

function normalizePathname(pathname: string) {
  const withoutLocale = pathname.replace(/^\/(zh|en)(?=\/|$)/, "");
  const withLeadingSlash = withoutLocale.startsWith("/") ? withoutLocale : `/${withoutLocale}`;
  const normalized = withLeadingSlash === "//" ? "/" : withLeadingSlash;
  if (normalized === "") return "/";
  if (normalized === "/") return "/";
  return normalized.replace(/\/+$/, "");
}

function shouldMatch(current: string, target: string, exact?: boolean) {
  const c = normalizePathname(current);
  const t = normalizePathname(target);
  if (exact) return c === t;
  return c === t || c.startsWith(`${t}/`);
}

export function SidebarRuntime({ locale }: { locale: "zh" | "en" }) {
  React.useEffect(() => {
    const aside = document.getElementById("fx-system-sidebar");
    if (!aside) return;

    const collapsedKey = "fxlocus_system_sidebar_collapsed";
    const getCollapsed = () => {
      try {
        return window.localStorage.getItem(collapsedKey) === "1";
      } catch {
        return false;
      }
    };
    const setCollapsed = (next: boolean) => {
      aside.setAttribute("data-collapsed", next ? "1" : "0");
      try {
        window.localStorage.setItem(collapsedKey, next ? "1" : "0");
      } catch {
        // ignore
      }
    };

    setCollapsed(getCollapsed());

    const updateActive = () => {
      const current = window.location.pathname || "";
      const links = Array.from(aside.querySelectorAll<HTMLElement>("[data-sidebar-href]"));
      links.forEach((el) => el.removeAttribute("aria-current"));
      const matched = links.find((el) => {
        const href = el.getAttribute("data-sidebar-href") || "";
        const exact = el.getAttribute("data-sidebar-exact") === "1";
        return href ? shouldMatch(current, href, exact) : false;
      });
      if (matched) matched.setAttribute("aria-current", "page");
    };

    const setBadge = (key: string, count: number) => {
      const el = aside.querySelector<HTMLElement>(`[data-badge-key="${CSS.escape(key)}"]`);
      if (!el) return;
      if (count > 0) {
        el.textContent = count > 99 ? "99+" : String(count);
        el.classList.remove("hidden");
        el.classList.add("inline-flex");
      } else {
        el.textContent = "";
        el.classList.add("hidden");
        el.classList.remove("inline-flex");
      }
    };

    const applyCounts = (json: any) => {
      setBadge("unread", Number(json?.unread || 0));
      setBadge("consultUnread", Number(json?.consultUnread || 0));
      const pending = (json?.pending && typeof json.pending === "object") ? json.pending : {};
      Object.keys(pending).forEach((k) => {
        setBadge(`pending.${k}`, Number((pending as any)[k] || 0));
      });
    };

    let alive = true;
    let lastErrorAt = 0;
    let lastFetchAt = 0;

    const refreshCounts = async () => {
      if (!alive) return;
      const now = Date.now();
      if (now - lastErrorAt < 20_000) return;
      if (now - lastFetchAt < 10_000) return;
      lastFetchAt = now;
      try {
        const res = await fetch("/api/system/sidebar-counts", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok || !json?.ok) return;
        applyCounts(json);
      } catch {
        lastErrorAt = Date.now();
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const actionEl = target.closest<HTMLElement>("[data-sidebar-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-sidebar-action");
      if (action === "toggle") {
        e.preventDefault();
        setCollapsed(aside.getAttribute("data-collapsed") === "1" ? false : true);
        return;
      }
      if (action === "logout") {
        e.preventDefault();
        (async () => {
          try {
            await fetch("/api/system/auth/logout", { method: "POST" });
          } finally {
            window.location.href = `/${locale}/system/login`;
          }
        })();
      }
    };

    const onFocus = () => {
      if (document.hidden) return;
      updateActive();
      refreshCounts();
    };

    updateActive();
    refreshCounts();

    const pollMs = (navigator as any)?.connection?.saveData ? 30_000 : 12_000;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      refreshCounts();
    }, pollMs);

    aside.addEventListener("click", onClick);
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      aside.removeEventListener("click", onClick);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [locale]);

  return null;
}

