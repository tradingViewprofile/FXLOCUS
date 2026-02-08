import React from "react";

import type { SystemRole } from "@/lib/system/roles";
import { SystemTopRightControls } from "@/components/system/SystemTopRightControls";
import { TopbarLogoutButton } from "@/components/system/TopbarLogoutButton";

type Props = {
  locale: "zh" | "en";
  user: { full_name: string | null; role: SystemRole };
};

export function Topbar({ locale, user }: Props) {
  const roleLabel =
    user.role === "super_admin"
      ? locale === "zh"
        ? "超级管理员"
        : "Super Admin"
      : user.role === "leader"
        ? locale === "zh"
          ? "团队长"
          : "Leader"
        : user.role === "trader"
          ? locale === "zh"
            ? "交易员"
            : "Trader"
        : user.role === "coach"
          ? locale === "zh"
            ? "教练"
            : "Coach"
          : user.role === "assistant"
            ? locale === "zh"
              ? "助教"
              : "Assistant"
            : locale === "zh"
              ? "学员"
              : "Student";

  return (
    <div
      className="relative z-30 border-b border-[color:var(--border)] bg-[color:var(--panel)] backdrop-blur flex items-center"
      style={{
        height: "var(--system-topbar-height)",
        paddingLeft: "var(--system-topbar-padding-x)",
        paddingRight: "var(--system-topbar-padding-x)",
        gap: "var(--system-topbar-gap)"
      }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-white/80 text-sm">
          {user.full_name || (locale === "zh" ? "用户" : "User")}
          <span className="ml-2 text-white/40 text-xs">{roleLabel}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SystemTopRightControls locale={locale} />
        <TopbarLogoutButton locale={locale} />
      </div>
    </div>
  );
}

