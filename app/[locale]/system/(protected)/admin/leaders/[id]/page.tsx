import { unstable_noStore } from "next/cache";
import { redirect } from "next/navigation";

import { AdminStudentDetailClient } from "@/components/system/admin/AdminStudentDetailClient";
import { requireSystemUser } from "@/lib/system/auth";
import { isSuperAdmin } from "@/lib/system/roles";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({
  params
}: {
  params: { locale: "zh" | "en"; id: string };
}) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const user = await requireSystemUser(locale);
  if (!isSuperAdmin(user.role)) redirect(`/${locale}/system/403`);

  const leaderId = params.id?.trim();
  if (!leaderId) redirect(`/${locale}/system/admin/leaders`);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/system/admin/leaders"
            locale={locale}
            className="inline-flex items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-1.5 text-sm text-white/80 hover:bg-[color:var(--panel-2)]"
          >
            {locale === "zh" ? "返回列表" : "Back to list"}
          </Link>
          <div className="text-white/90 font-semibold text-xl">
            {locale === "zh" ? "团队长详�? : "Leader details"}
          </div>
        </div>
        <div className="mt-2 text-white/60 text-sm">
          {locale === "zh" ? "查看团队长完整档案与团队信息�? : "View leader profile and team summary."}
        </div>
      </div>

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
        <AdminStudentDetailClient locale={locale} userId={leaderId} />
      </div>
    </div>
  );
}
