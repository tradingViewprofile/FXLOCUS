"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { withLocale } from "@/lib/i18n/withLocale";

export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale() as Locale;

  return useMemo(
    () => ({
      push: (href: string) => router.push(withLocale(locale, href)),
      replace: (href: string) => router.replace(withLocale(locale, href)),
      prefetch: (href: string) => router.prefetch(withLocale(locale, href)),
      back: () => router.back(),
      refresh: () => router.refresh()
    }),
    [locale, router]
  );
}

