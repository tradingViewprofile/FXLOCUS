import { SystemLoginClient } from "@/components/system/auth/SystemLoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SystemLoginPage({ params }: { params: { locale: "zh" | "en" } }) {
  const locale = params.locale === "en" ? "en" : "zh";
  return <SystemLoginClient locale={locale} />;
}

