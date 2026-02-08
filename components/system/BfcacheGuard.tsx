"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";

export function BfcacheGuard({ locale }: { locale: "zh" | "en" }) {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      fetch("/api/system/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!json?.ok) {
            router.replace(`/${locale}/system/login?next=${encodeURIComponent(pathname || "")}`);
          }
        })
        .catch(() => {
          router.replace(`/${locale}/system/login`);
        });
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [locale, pathname, router]);

  return null;
}
