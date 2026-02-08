import { unstable_noStore } from "next/cache";

import { AdminStudentsClient } from "@/components/system/admin/AdminStudentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AssistantStudentsPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  return <AdminStudentsClient locale={locale} />;
}
