import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";

import { requireSystemUser } from "@/lib/system/auth";
import { StudentDocumentsUploadClient } from "@/components/system/StudentDocumentsUploadClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentUploadsPage({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const user = await requireSystemUser(locale);
  if (user.student_status !== "普通学�?) {
    redirect(`/${locale}/system/dashboard`);
  }
  return <StudentDocumentsUploadClient locale={locale} />;
}
