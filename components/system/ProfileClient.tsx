"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";

import { isStrongSystemPassword } from "@/lib/system/passwordPolicy";
import { useSystemRealtimeRefresh } from "@/lib/system/useSystemRealtimeRefresh";

type Me = {
  ok: boolean;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: "student" | "trader" | "coach" | "assistant" | "leader" | "super_admin";
    status?: "active" | "frozen";
    student_status?: string | null;
    leader_id?: string | null;
  };
};

export function ProfileClient({ locale }: { locale: "zh" | "en" }) {
  const [me, setMe] = React.useState<Me | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const aliveRef = React.useRef(true);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const phonePattern = /^1[3-9]\d{9}$/;
  const phoneOk = !phone || phonePattern.test(phone);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system/me", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Me | null;
      if (!aliveRef.current) return;
      setMe(json);
      setName(json?.user?.full_name || "");
      setPhone(json?.user?.phone || "");
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    aliveRef.current = true;
    load();
    return () => {
      aliveRef.current = false;
    };
  }, [load]);

  useSystemRealtimeRefresh(load);

  const saveProfile = async () => {
    setError(null);
    if (!phoneOk) {
      setError(locale === "zh" ? "手机号格式不正确（仅支持中国大陆 11 位手机号）" : "Invalid phone number.");
      return;
    }
    const ok = window.confirm(locale === "zh" ? "确认保存个人资料？" : "Save profile changes?");
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/system/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "update_failed");
    } catch (e: any) {
      setError(e?.message || "update_failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(locale === "zh" ? "两次输入的新密码不一致" : "New passwords do not match.");
      return;
    }
    if (!isStrongSystemPassword(newPassword)) {
      setError(
        locale === "zh"
          ? "新密码必须包含：大写+小写+数字+特殊字符，长度 8-64"
          : "Password must include upper/lower/digit/special and be 8-64 chars."
      );
      return;
    }

    const ok = window.confirm(locale === "zh" ? "确认更新密码？" : "Update password?");
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/system/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "change_failed");
      await fetch("/api/system/auth/logout", { method: "POST" });
      window.location.href = `/${locale}/system/login`;
      return;
    } catch (e: any) {
      setError(e?.message || "change_failed");
    } finally {
      setSaving(false);
    }
  };

  const newOk = newPassword ? isStrongSystemPassword(newPassword) : false;
  const confirmOk = Boolean(newPassword) && newPassword === confirmPassword;
  const showPasswordCard = Boolean(me?.ok);
  const user = me?.user;
  const displayName = name || (locale === "zh" ? "未命名" : "Unnamed");
  const displayEmail = user?.email || "-";
  const badgeBase = String(name || user?.full_name || "").replace(/\s+/g, "");
  const badgeChars = Array.from(badgeBase);
  const badgeText = badgeChars.length ? badgeChars.slice(-2).join("").toUpperCase() : "FX";
  const status = user?.status || "active";
  const statusLabel =
    locale === "zh" ? (status === "frozen" ? "冻结" : "正常") : status === "frozen" ? "Frozen" : "Active";
  const statusClass =
    status === "frozen"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  const roleLabel = user?.role ? user.role.toUpperCase() : "-";
  const shortId = user?.id ? user.id.slice(0, 6).toUpperCase() : "-";
  const studentStatus = user?.student_status || "";

  return (
    <div className="min-h-[70vh] flex justify-center px-4 py-6">
      <div className="space-y-6 max-w-[980px] w-full">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/90 font-semibold text-xl">{locale === "zh" ? "个人资料" : "Profile"}</div>
          <div className="mt-2 text-white/60 text-sm">
            {locale === "zh" ? "维护你的个人信息与账号安全。" : "Manage your profile and account security."}
          </div>
        </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          {locale === "zh" ? "加载中…" : "Loading…"}
        </div>
      ) : null}

      {me?.ok ? (
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 w-full h-full flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-white/85 flex items-center justify-center text-sm font-semibold">
                {badgeText}
              </div>
              <div>
                <div className="text-white/90 font-semibold select-none">{displayName}</div>
                <div className="text-xs text-white/50 select-none">{displayEmail}</div>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full border px-2.5 py-1 ${statusClass}`}>{statusLabel}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                  {roleLabel}
                </span>
              </div>
            </div>
            <div className="text-white/85 font-semibold">{locale === "zh" ? "资料" : "Profile"}</div>
            <div>
              <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "姓名" : "Full name"}</div>
              <div className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white/85 text-sm select-none">
                {name || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "手机号" : "Phone"}</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ""))}
                className={[
                  "w-full rounded-xl bg-white/5 border px-3 py-2 text-white/85 text-sm",
                  phoneOk ? "border-white/10" : "border-rose-400/30"
                ].join(" ")}
                placeholder={locale === "zh" ? "请输入 11 位手机号" : "Phone number"}
              />
              {!phoneOk ? (
                <div className="mt-2 text-xs text-rose-200/90">
                  {locale === "zh" ? "手机号格式不正确" : "Invalid phone number"}
                </div>
              ) : (
                <div className="mt-2 text-xs text-white/45">
                  {locale === "zh" ? "仅支持中国大陆 11 位手机号" : "China mainland 11-digit only"}
                </div>
              )}
            </div>
            <div className="grid gap-2 text-xs text-white/55">
              <div>
                {locale === "zh" ? "邮箱：" : "Email: "}{" "}
                <span className="text-white/80 select-none">{displayEmail}</span>
              </div>
              <div>
                {locale === "zh" ? "账号ID：" : "Account ID: "}{" "}
                <span className="text-white/80 select-none">{shortId}</span>
              </div>
              {studentStatus ? (
                <div>
                  {locale === "zh" ? "学员状态：" : "Student status: "}{" "}
                  <span className="text-white/80">{studentStatus}</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={saving || !phoneOk}
              onClick={saveProfile}
              className="mt-auto px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
            >
              {locale === "zh" ? "保存资料" : "Save profile"}
            </button>
          </div>

          {showPasswordCard ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4 h-full flex flex-col">
              <div className="text-white/85 font-semibold">{locale === "zh" ? "安全设置" : "Security"}</div>
              <div>
                <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "当前密码" : "Current password"}</div>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 pr-10 text-white/85 text-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/55 hover:text-white/80 hover:bg-white/10"
                    aria-label={showCurrentPassword ? (locale === "zh" ? "隐藏密码" : "Hide password") : (locale === "zh" ? "显示密码" : "Show password")}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "新密码" : "New password"}</div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={[
                      "w-full rounded-xl bg-white/5 border px-3 py-2 pr-10 text-white/85 text-sm",
                      newPassword && !newOk ? "border-rose-400/30" : "border-white/10"
                    ].join(" ")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/55 hover:text-white/80 hover:bg-white/10"
                    aria-label={showNewPassword ? (locale === "zh" ? "隐藏密码" : "Hide password") : (locale === "zh" ? "显示密码" : "Show password")}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-white/55 mb-2">{locale === "zh" ? "确认密码" : "Confirm password"}</div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={[
                      "w-full rounded-xl bg-white/5 border px-3 py-2 pr-10 text-white/85 text-sm",
                      confirmPassword && !confirmOk ? "border-rose-400/30" : "border-white/10"
                    ].join(" ")}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/55 hover:text-white/80 hover:bg-white/10"
                    aria-label={showConfirmPassword ? (locale === "zh" ? "隐藏密码" : "Hide password") : (locale === "zh" ? "显示密码" : "Show password")}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !confirmOk ? (
                  <div className="mt-2 text-xs text-rose-200/90">
                    {locale === "zh" ? "两次密码不一致" : "Passwords do not match."}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={saving || !currentPassword.trim() || !newOk || !confirmOk}
                onClick={changePassword}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 disabled:opacity-50"
              >
                {locale === "zh" ? "更新密码" : "Update password"}
              </button>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/55">
                {locale === "zh"
                  ? "建议定期更换密码，保持账号安全。"
                  : "Update passwords regularly to keep your account secure."}
              </div>
              <div className="text-xs text-white/50">
                {locale === "zh"
                  ? "规则：大写+小写+数字+特殊字符，长度 8-64"
                  : "Rule: upper+lower+digit+special, 8-64 chars."}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
          {error}
        </div>
      ) : null}
      </div>
    </div>
  );
}

