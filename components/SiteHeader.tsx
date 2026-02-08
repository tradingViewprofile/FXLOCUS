"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { type Locale } from "@/i18n/routing";
import { stripLocale } from "@/lib/i18n/withLocale";

function normalizePathname(pathname: string) {
  const withoutLocale = pathname.replace(/^\/(zh|en)(?=\/|$)/, "");
  const withLeadingSlash = withoutLocale.startsWith("/") ? withoutLocale : `/${withoutLocale}`;
  const normalized = withLeadingSlash === "//" ? "/" : withLeadingSlash;
  if (normalized === "") return "/";
  if (normalized === "/") return "/";
  return normalized.replace(/\/+$/, "");
}

function isNavActive(pathname: string, href: string) {
  const current = normalizePathname(pathname);
  const target = normalizePathname(href);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

function isSystemAuthPath(pathname: string) {
  return (
    pathname.includes("/system/login") ||
    pathname.includes("/system/forgot-password") ||
    pathname.includes("/system/reset-password")
  );
}

type DropdownItem = {
  key: string;
  href: string;
  label: string;
  desc: string;
};

function LocaleSwitcher() {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const basePath = stripLocale(pathname || "/");

  const items = useMemo(
    () => [
      { locale: "zh" as const, label: tCommon("ui.locale.zh") },
      { locale: "en" as const, label: tCommon("ui.locale.en") }
    ],
    [tCommon]
  );

  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
      {items.map((item) => {
        const active = item.locale === locale;
        return (
          <Link
            key={item.locale}
            href={basePath}
            locale={item.locale}
            prefetch={false}
            className={[
              "fx-tab rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active
                ? "bg-white/10 text-slate-50 fx-tab-active"
                : "text-slate-200/75 hover:text-slate-50"
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavDropdown({
  label,
  items,
  active,
  open,
  onOpen,
  onClose,
  onPrefetch
}: {
  label: string;
  items: DropdownItem[];
  active: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPrefetch: (href: string) => void;
}) {
  return (
    <div className="relative" onMouseEnter={onOpen} onMouseLeave={onClose}>
      <button
        type="button"
        onClick={() => (open ? onClose() : onOpen())}
        className={[
          "fx-tab inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
          active || open
            ? "bg-white/10 text-slate-50 fx-tab-active"
            : "text-slate-200/70 hover:bg-white/5 hover:text-slate-50"
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        <ChevronDown className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute left-1/2 top-full z-40 mt-3 w-[420px] -translate-x-1/2 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
          <div className="grid gap-2">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                onMouseEnter={() => onPrefetch(item.href)}
                onFocus={() => onPrefetch(item.href)}
                className="fx-tab rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-sky-400/40 hover:bg-white/10"
              >
                <div className="text-sm font-semibold text-slate-50">{item.label}</div>
                <div className="mt-1 text-xs text-slate-200/70">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const windowPath = typeof window !== "undefined" ? window.location.pathname || "" : "";
  const currentPath = pathname || windowPath;
  const systemPath = currentPath.includes("/system");
  const systemActive = systemPath && !isSystemAuthPath(currentPath);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"courses" | "official" | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu(null);
      closeTimerRef.current = null;
    }, 160);
  };

  const openDropdown = (key: "courses" | "official") => {
    clearCloseTimer();
    setOpenMenu(key);
  };

  const navLinks = useMemo(
    () => [
      { key: "home", href: "/" },
      { key: "framework", href: "/framework" },
      { key: "markets", href: "/markets" },
      { key: "news", href: "/news" },
      { key: "system", href: "/system/login", activePath: "/system" },
      { key: "donate", href: "/donate" },
      { key: "contact", href: "/contact" }
    ],
    []
  );

  const courseMenu = useMemo<DropdownItem[]>(
    () => [
      {
        key: "programs",
        href: "/programs",
        label: tNav("programs"),
        desc: locale === "zh" ? "体系课程与服务总览" : "Programs and services overview"
      },
      {
        key: "insights",
        href: "/insights",
        label: tNav("insights"),
        desc: locale === "zh" ? "训练导向的思想文章" : "Insight articles for training"
      },
      {
        key: "videos",
        href: "/videos",
        label: tNav("videos"),
        desc: locale === "zh" ? "短视频与训练作业" : "Short videos and tasks"
      },
      {
        key: "courses",
        href: "/courses",
        label: tNav("courses"),
        desc: locale === "zh" ? "结构化课节与进度" : "Structured lessons and progress"
      }
    ],
    [locale, tNav]
  );

  const officialMenu = useMemo<DropdownItem[]>(
    () => [
      {
        key: "academy",
        href: "/academy",
        label: tNav("academy"),
        desc: locale === "zh" ? "系统化教学与学习路径" : "Structured lessons and learning path"
      },
      {
        key: "tools",
        href: "/tools",
        label: tNav("tools"),
        desc: locale === "zh" ? "交易工具与计算器" : "Trading tools and calculators"
      },
      {
        key: "faq",
        href: "/faq",
        label: tNav("faq"),
        desc: locale === "zh" ? "常见问题与训练规则" : "FAQs and training rules"
      },
      {
        key: "about",
        href: "/about",
        label: tNav("about"),
        desc: locale === "zh" ? "关于我们与理念" : "About the team and approach"
      }
    ],
    [locale, tNav]
  );

  const brand = locale === "zh" ? tCommon("brandCn") : tCommon("brandEn");
  const tagline = [
    tCommon("labels.mind"),
    tCommon("labels.market"),
    tCommon("labels.price")
  ].join(" · ");

  const prefetchRoute = useCallback(
    (href: string, targetLocale: Locale = locale) => {
      if (!href || href.startsWith("#") || href.startsWith("?")) return;
      if (/^(https?:|mailto:|tel:)/.test(href)) return;
      const normalized = stripLocale(href);
      if (!normalized || normalized.startsWith("#") || normalized.startsWith("?")) return;
      const key = `${targetLocale}:${normalized}`;
      if (prefetchedRef.current.has(key)) return;
      prefetchedRef.current.add(key);
      router.prefetch(normalized, { locale: targetLocale });
    },
    [locale, router]
  );

  const prefetchMenu = useCallback(
    (items: DropdownItem[]) => {
      items.forEach((item) => prefetchRoute(item.href));
    },
    [prefetchRoute]
  );

  useEffect(() => {
    if (systemActive) return;
    if (typeof window === "undefined") return;
    if (currentPath.includes("/system")) return;

    const basePath = stripLocale(currentPath || "/");
    const targetLocale: Locale = locale === "zh" ? "en" : "zh";
    const targets = [
      ...navLinks.map((item) => item.href),
      ...courseMenu.map((item) => item.href),
      ...officialMenu.map((item) => item.href)
    ];

    const run = () => {
      prefetchRoute(basePath, targetLocale);
      targets.forEach((href) => prefetchRoute(href));
    };

    if ("requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(() => run(), { timeout: 1600 });
      return () => (window as any).cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(run, 700);
    return () => clearTimeout(timeoutId);
  }, [
    courseMenu,
    currentPath,
    locale,
    navLinks,
    officialMenu,
    prefetchRoute,
    systemActive
  ]);


  if (systemActive) return null;

  return (
    <header className="site-header sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 whitespace-nowrap"
          onMouseEnter={() => prefetchRoute("/")}
          onFocus={() => prefetchRoute("/")}
        >
          <Image
            src="/brand/logo-mark.svg"
            width={36}
            height={36}
            priority
            alt={brand}
            className="h-9 w-9"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold tracking-[0.14em] text-slate-50 whitespace-nowrap">
              {brand}
            </span>
            <span className="hidden text-[11px] tracking-[0.18em] text-slate-200/60 xl:block whitespace-nowrap">
              {tagline}
            </span>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 text-sm xl:flex">
          {navLinks.map((item) => {
            const active = isNavActive(pathname, item.activePath || item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                onMouseEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                className={[
                  "fx-tab rounded-full px-3 py-2 whitespace-nowrap transition-colors",
                  active
                    ? "bg-white/10 text-slate-50 fx-tab-active"
                    : "text-slate-200/70 hover:bg-white/5 hover:text-slate-50"
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {tNav(item.key)}
              </Link>
            );
          })}

          <NavDropdown
            label={tNav("programs")}
            items={courseMenu}
            active={courseMenu.some((item) => isNavActive(pathname, item.href))}
            open={openMenu === "courses"}
            onOpen={() => {
              prefetchMenu(courseMenu);
              openDropdown("courses");
            }}
            onClose={scheduleClose}
            onPrefetch={prefetchRoute}
          />

          <NavDropdown
            label={tNav("official")}
            items={officialMenu}
            active={officialMenu.some((item) => isNavActive(pathname, item.href))}
            open={openMenu === "official"}
            onOpen={() => {
              prefetchMenu(officialMenu);
              openDropdown("official");
            }}
            onClose={scheduleClose}
            onPrefetch={prefetchRoute}
          />
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-50 xl:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? tCommon("ui.close") : tCommon("ui.menu")}
          >
            {mobileOpen ? tCommon("ui.close") : tCommon("ui.menu")}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-slate-950/70 backdrop-blur xl:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4">
            <div className="flex justify-between">
              <span className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {tCommon("ui.nav")}
              </span>
              <LocaleSwitcher />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((item) => {
                const active = isNavActive(pathname, item.activePath || item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch
                    onMouseEnter={() => prefetchRoute(item.href)}
                    onFocus={() => prefetchRoute(item.href)}
                    className={[
                      "fx-tab rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-sky-400/30 bg-white/10 text-slate-50 fx-tab-active"
                        : "text-slate-100/90 hover:bg-white/10"
                    ].join(" ")}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    {tNav(item.key)}
                  </Link>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {tNav("programs")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {courseMenu.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch
                    onMouseEnter={() => prefetchRoute(item.href)}
                    onFocus={() => prefetchRoute(item.href)}
                    className={[
                      "fx-tab rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-sky-400/30 bg-white/10 text-slate-50 fx-tab-active"
                          : "text-slate-100/90 hover:bg-white/10"
                      ].join(" ")}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                {tNav("official")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {officialMenu.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      prefetch
                      onMouseEnter={() => prefetchRoute(item.href)}
                      onFocus={() => prefetchRoute(item.href)}
                      className={[
                        "fx-tab rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-sky-400/30 bg-white/10 text-slate-50 fx-tab-active"
                          : "text-slate-100/90 hover:bg-white/10"
                      ].join(" ")}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
