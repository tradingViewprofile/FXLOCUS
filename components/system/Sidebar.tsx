import React from "react";
import Image from "next/image";
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderCog,
  FolderDown,
  Gauge,
  HandHeart,
  ImageUp,
  LayoutDashboard,
  Lightbulb,
  Mail,
  MessageCircle,
  Settings,
  ShieldCheck,
  TrendingUp,
  UploadCloud,
  User,
  UserCog,
  Users
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { isAdminRole, isLearnerRole, type SystemRole } from "@/lib/system/roles";
import { SidebarRuntime } from "@/components/system/sidebar/SidebarRuntime";

type NavItem = {
  href: string;
  zh: string;
  en: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badgeKey?: string;
};

function SidebarItem({
  locale,
  item
}: {
  locale: "zh" | "en";
  item: NavItem;
}) {
  const Icon = item.icon;
  const title = locale === "zh" ? item.zh : item.en;
  return (
    <Link
      href={item.href}
      title={title}
      prefetch
      data-sidebar-href={item.href}
      data-sidebar-exact={item.exact ? "1" : "0"}
      className={[
        "sidebar-item group relative flex w-full items-center rounded-2xl border text-sm transition-colors",
        "justify-start gap-3",
        "bg-transparent border-[color:var(--border)] text-white/75 hover:bg-[color:var(--panel)] hover:text-white"
      ].join(" ")}
    >
      <Icon className="sidebar-icon shrink-0 text-white/70 group-hover:text-white" />
      <span className="min-w-0 truncate sidebar-label">{title}</span>

      {item.badgeKey ? (
        <span
          data-badge-key={item.badgeKey}
          className={[
            "sidebar-badge hidden h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[11px] font-semibold text-white ml-auto"
          ].join(" ")}
        />
      ) : null}
    </Link>
  );
}

export function Sidebar({
  locale,
  user
}: {
  locale: "zh" | "en";
  user: Pick<{ role: SystemRole; student_status?: string | null }, "role" | "student_status">;
}) {
  // Server component: render static nav; client runtime updates active state/badges/collapse.

  const showStudentUploads = user.role === "student" && user.student_status === "普通学员";
  const showTradeMenus = (isLearnerRole(user.role) || user.role === "leader") && user.role !== "assistant";
  const showClassicTrades = (isLearnerRole(user.role) || user.role === "leader") && user.role !== "assistant";

  const studentItems: NavItem[] = [
    { href: "/system/dashboard", zh: "仪表盘", en: "Dashboard", icon: LayoutDashboard },
    { href: "/system/courses", zh: "课程", en: "Courses", icon: BookOpen },
    ...(showStudentUploads ? ([{ href: "/system/uploads", zh: "资料上传", en: "Uploads", icon: UploadCloud }] as NavItem[]) : []),
    { href: "/system/files", zh: "文件", en: "Files", icon: FolderDown },
    ...(showTradeMenus
      ? ([
          { href: "/system/trade-logs", zh: "交易日志", en: "Trade Logs", icon: FileText },
          { href: "/system/trade-strategies", zh: "交易策略", en: "Trade Strategies", icon: Lightbulb }
        ] as NavItem[])
      : []),
    ...(showClassicTrades ? ([{ href: "/system/classic-trades", zh: "经典交易", en: "Classic Trades", icon: ImageUp }] as NavItem[]) : []),
    ...((isLearnerRole(user.role) || user.role === "leader")
      ? ([{ href: "/system/weekly-summaries", zh: "周总结", en: "Weekly Summary", icon: ClipboardList }] as NavItem[])
      : []),
    { href: "/system/notifications", zh: "通知", en: "Notifications", icon: Bell, badgeKey: "unread" },
    { href: "/system/consult", zh: "咨询", en: "Consult", icon: MessageCircle, badgeKey: "consultUnread" },
    { href: "/system/profile", zh: "个人资料", en: "Profile", icon: User },
    { href: "/system/ladder", zh: "天梯", en: "Ladder", icon: TrendingUp }
  ];

  const adminItems: NavItem[] = [
    { href: "/system/admin", zh: "管理概览", en: "Admin Home", icon: Gauge, exact: true },
    ...(user.role === "leader"
      ? ([
          { href: "/system/admin/my-leaders", zh: "我的团队长", en: "My Leaders", icon: UserCog },
          { href: "/system/admin/my-traders", zh: "我的交易员", en: "My Traders", icon: Users },
          { href: "/system/admin/coaches", zh: "教练管理", en: "Coach Management", icon: UserCog },
          { href: "/system/admin/assistants", zh: "助教管理", en: "Assistant Management", icon: UserCog },
          { href: "/system/admin/donations", zh: "捐赠管理", en: "Donations", icon: HandHeart, badgeKey: "pending.donations" }
        ] as NavItem[])
      : []),
    ...(user.role === "super_admin"
      ? ([
          { href: "/system/admin/leaders", zh: "团队长管理", en: "Leader Management", icon: UserCog },
          { href: "/system/admin/traders", zh: "交易员管理", en: "Trader Management", icon: Users },
          { href: "/system/admin/coaches", zh: "教练管理", en: "Coach Management", icon: UserCog },
          { href: "/system/admin/assistants", zh: "助教管理", en: "Assistant Management", icon: UserCog }
        ] as NavItem[])
      : []),
    { href: "/system/admin/students", zh: "学员管理", en: "Students", icon: Users },
    ...(user.role === "leader" || user.role === "super_admin"
      ? ([
          { href: "/system/admin/student-documents", zh: "学员资料", en: "Student Documents", icon: FolderDown, badgeKey: "pending.studentDocuments" }
        ] as NavItem[])
      : []),
    { href: "/system/admin/courses", zh: "课程审批", en: "Course Approvals", icon: ClipboardCheck, badgeKey: "pending.courseAccess" },
    { href: "/system/admin/course-summaries", zh: "课程总结", en: "Course Summaries", icon: FileText, badgeKey: "pending.courseSummaries" },
    { href: "/system/admin/weekly-summaries/students", zh: "学员周总结", en: "Student Weekly Summaries", icon: ClipboardList, badgeKey: "pending.weeklySummariesStudent" },
    ...(user.role === "leader" || user.role === "super_admin"
      ? ([{ href: "/system/admin/weekly-summaries/assistants", zh: "助教周总结", en: "Assistant Weekly Summaries", icon: ClipboardList, badgeKey: "pending.weeklySummariesAssistant" }] as NavItem[])
      : []),
    ...(user.role === "super_admin"
      ? ([{ href: "/system/admin/weekly-summaries/leaders", zh: "团队长周总结", en: "Leader Weekly Summaries", icon: ClipboardList, badgeKey: "pending.weeklySummariesLeader" }] as NavItem[])
      : []),
    ...(user.role === "super_admin"
      ? ([{ href: "/system/admin/course-content", zh: "课程内容", en: "Course Content", icon: UploadCloud }] as NavItem[])
      : []),
    ...(user.role === "super_admin"
      ? ([{ href: "/system/admin/files", zh: "文件库", en: "File Library", icon: FolderCog, exact: true }] as NavItem[])
      : []),
    { href: "/system/admin/files/requests", zh: "文件权限审批", en: "File Access", icon: ShieldCheck, badgeKey: "pending.fileAccess" },
    { href: "/system/admin/trade-logs", zh: "交易日志审批", en: "Trade Logs", icon: FileText, badgeKey: "pending.tradeLogs" },
    { href: "/system/admin/trade-strategies", zh: "交易策略审批", en: "Trade Strategies", icon: Lightbulb, badgeKey: "pending.tradeStrategies" },
    { href: "/system/admin/classic-trades", zh: "经典交易管理", en: "Classic Trades", icon: ImageUp, badgeKey: "pending.classicTrades" },
    { href: "/system/admin/student-strategies", zh: "学员策略管理", en: "Student Strategies", icon: ClipboardList },
    { href: "/system/admin/ladder", zh: "天梯管理", en: "Ladder Admin", icon: ImageUp, badgeKey: "pending.ladderRequests" },
    ...(user.role === "super_admin"
      ? ([
          { href: "/system/admin/donations", zh: "捐赠管理", en: "Donations", icon: HandHeart, badgeKey: "pending.donations" },
          { href: "/system/admin/enrollments", zh: "报名管理", en: "Enrollments", icon: ClipboardList, badgeKey: "pending.enrollments" },
          { href: "/system/admin/contacts", zh: "联系管理", en: "Contacts", icon: Mail, badgeKey: "pending.contacts" },
          { href: "/system/admin/reports", zh: "报表", en: "Reports", icon: BarChart3 }
        ] as NavItem[])
      : []),
    { href: "/system/admin/settings", zh: "设置", en: "Settings", icon: Settings }
  ];

  const coachItems: NavItem[] =
    user.role === "coach"
      ? ([
          { href: "/system/coach/trade-logs", zh: "交易日志审批", en: "Trade Logs", icon: FileText, badgeKey: "pending.tradeLogs" },
          { href: "/system/coach/trade-strategies", zh: "交易策略审批", en: "Trade Strategies", icon: Lightbulb, badgeKey: "pending.tradeStrategies" },
          { href: "/system/coach/weekly-summaries", zh: "学员周总结", en: "Weekly Summaries", icon: ClipboardList, badgeKey: "pending.weeklySummariesStudent" },
          { href: "/system/coach/courses", zh: "课程审批", en: "Course Approvals", icon: ClipboardCheck, badgeKey: "pending.courseAccess" },
          { href: "/system/coach/reports", zh: "报表", en: "Reports", icon: BarChart3 }
        ] as NavItem[])
      : [];

  const assistantItems: NavItem[] =
    user.role === "assistant"
      ? ([
          { href: "/system/assistant/students", zh: "学员管理", en: "Students", icon: Users },
          { href: "/system/assistant/courses", zh: "课程审批", en: "Course Approvals", icon: ClipboardCheck, badgeKey: "pending.courseAccess" },
          { href: "/system/assistant/course-summaries", zh: "课程总结", en: "Course Summaries", icon: FileText, badgeKey: "pending.courseSummaries" },
          { href: "/system/assistant/student-documents", zh: "学员资料", en: "Student Documents", icon: FolderDown, badgeKey: "pending.studentDocuments" },
          { href: "/system/assistant/files/requests", zh: "文件权限审批", en: "File Access", icon: ShieldCheck, badgeKey: "pending.fileAccess" },
          { href: "/system/assistant/weekly-summaries", zh: "学员周总结", en: "Weekly Summaries", icon: ClipboardList, badgeKey: "pending.weeklySummariesStudent" },
          { href: "/system/assistant/trade-logs", zh: "交易日志审批", en: "Trade Logs", icon: FileText, badgeKey: "pending.tradeLogs" },
          { href: "/system/assistant/classic-trades", zh: "经典交易管理", en: "Classic Trades", icon: ImageUp, badgeKey: "pending.classicTrades" }
        ] as NavItem[])
      : [];

  return (
    <aside
      id="fx-system-sidebar"
      className="system-sidebar h-full flex-shrink-0 border-r border-[color:var(--border)] bg-[color:var(--bg)] flex flex-col transition-[width] duration-200"
      data-collapsed="0"
      data-locale={locale}
    >
      <SidebarRuntime locale={locale} />

      <div
        className="sidebar-header flex items-center border-b border-[color:var(--border)] h-[var(--system-topbar-height)] px-3"
      >
        <div className="flex items-center min-w-0 gap-2">
          <Image src="/brand/logo-mark.svg" width={28} height={28} alt="FxLocus" className="sidebar-logo h-7 w-7" />
          <div className="text-white font-semibold tracking-tight truncate sidebar-label">
            {locale === "zh" ? "系统" : "System"}
          </div>
        </div>

        <button
          type="button"
          data-sidebar-action="toggle"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] text-white/80 hover:bg-[color:var(--panel-2)]"
          aria-label={locale === "zh" ? "折叠/展开侧边栏" : "Toggle sidebar"}
        >
          <span className="text-xs font-semibold">≡</span>
        </button>
      </div>

      <div className="sidebar-body flex flex-col gap-3 overflow-y-auto flex-1 sidebar-scroll p-3">
        <div className="sidebar-section flex flex-col gap-2">
          <div className="sidebar-section-title text-xs text-white/40 px-2 sidebar-label">
            {locale === "zh" ? "学习区" : "Student"}
          </div>
          <div className="sidebar-items flex flex-col gap-2">
            {studentItems.map((item) => (
              <SidebarItem key={item.href} locale={locale} item={item} />
            ))}
          </div>
        </div>

        {isAdminRole(user.role) ? (
          <div className="sidebar-section flex flex-col gap-2">
            <div className="sidebar-section-title pt-2 text-xs text-white/40 px-2 sidebar-label">
              {locale === "zh" ? "管理区" : "Admin"}
            </div>
            <div className="sidebar-items flex flex-col gap-2">
              {adminItems.map((item) => (
                <SidebarItem key={item.href} locale={locale} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {coachItems.length ? (
          <div className="sidebar-section flex flex-col gap-2">
            <div className="sidebar-section-title pt-2 text-xs text-white/40 px-2 sidebar-label">
              {locale === "zh" ? "教练区" : "Coach"}
            </div>
            <div className="sidebar-items flex flex-col gap-2">
              {coachItems.map((item) => (
                <SidebarItem key={item.href} locale={locale} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {assistantItems.length ? (
          <div className="sidebar-section flex flex-col gap-2">
            <div className="sidebar-section-title pt-2 text-xs text-white/40 px-2 sidebar-label">
              {locale === "zh" ? "助教区" : "Assistant"}
            </div>
            <div className="sidebar-items flex flex-col gap-2">
              {assistantItems.map((item) => (
                <SidebarItem key={item.href} locale={locale} item={item} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="sidebar-footer border-t border-[color:var(--border)] p-3">
        <button
          type="button"
          data-sidebar-action="logout"
          className={[
            "sidebar-item w-full flex items-center rounded-2xl border text-sm transition-colors",
            "justify-start gap-3",
            "border-[color:var(--border)] text-white/75 hover:bg-[color:var(--panel)] hover:text-white"
          ].join(" ")}
        >
          <span className="sidebar-icon shrink-0 text-white/70">⎋</span>
          <span className="sidebar-label">{locale === "zh" ? "退出系统" : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}
