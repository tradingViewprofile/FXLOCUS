import { unstable_noStore } from "next/cache";

import { NotificationsClient } from "@/components/system/NotificationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NotificationsPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  return <NotificationsClient locale={locale} />;
}

