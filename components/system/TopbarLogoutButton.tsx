"use client";

import React from "react";

export function TopbarLogoutButton({ locale }: { locale: "zh" | "en" }) {
  const [loading, setLoading] = React.useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/system/auth/logout", { method: "POST" });
    } finally {
      window.location.href = `/${locale}/system/login`;
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={logout}
      className="px-3 py-1.5 rounded-xl bg-[color:var(--panel)] border border-[color:var(--border)] text-white/80 hover:bg-[color:var(--panel-2)] disabled:opacity-50"
    >
      {locale === "zh" ? "退出系统" : "Logout"}
    </button>
  );
}

