import React from "react";

import { SystemLoadingScreen } from "@/components/system/SystemLoadingScreen";

export default function SystemLoading({ params }: { params: { locale: "zh" | "en" } }) {
  const locale = params?.locale === "en" ? "en" : "zh";
  return <SystemLoadingScreen locale={locale} />;
}
