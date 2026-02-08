import { unstable_noStore } from "next/cache";

import { ProfileClient } from "@/components/system/ProfileClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ProfilePage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  return <ProfileClient locale={locale} />;
}

