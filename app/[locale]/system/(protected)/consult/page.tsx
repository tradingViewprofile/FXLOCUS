import { unstable_noStore } from "next/cache";

import { ConsultClient } from "@/components/system/ConsultClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ConsultPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  return <ConsultClient locale={locale} />;
}
