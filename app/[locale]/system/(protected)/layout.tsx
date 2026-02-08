import React from "react";
import { unstable_noStore } from "next/cache";

import { requireSystemUser } from "@/lib/system/auth";
import { Sidebar } from "@/components/system/Sidebar";
import { Topbar } from "@/components/system/Topbar";
import { BfcacheGuard } from "@/components/system/BfcacheGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SystemProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: "zh" | "en" };
}) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";
  const user = await requireSystemUser(locale);
  return (
    <div className="fixed left-0 right-0 bottom-0 top-0">
      <BfcacheGuard locale={locale} />
      <div className="system-shell flex h-full w-full">
        <Sidebar locale={locale} user={user} />
        <main className="system-main relative flex-1 min-w-0 h-full flex flex-col overflow-visible fx-galaxy-bg">
          <Topbar locale={locale} user={{ full_name: user.full_name, role: user.role }} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="system-content min-h-full w-full p-[var(--system-content-padding)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

