"use client";

import { useEffect } from "react";

type Props = {
  locale: "zh" | "en";
};

export function LocaleMeta({ locale }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale === "en" ? "en" : "zh-CN";
    root.classList.toggle("font-en", locale === "en");
    root.classList.toggle("font-zh", locale !== "en");
  }, [locale]);

  return null;
}

