import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";

export default function SystemForbidden({ params }: { params: { locale: "zh" | "en" } }) {
  unstable_noStore();
  const locale = params.locale === "en" ? "en" : "zh";

  return (
    <div className="mx-auto max-w-[720px] py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-white text-2xl font-semibold">
          {locale === "zh" ? "无权限访�? : "Access denied"}
        </h1>
        <p className="mt-3 text-white/70 leading-7">
          {locale === "zh"
            ? "你的账号没有访问该页面的权限�?
            : "Your account doesn’t have permission to view this page."}
        </p>
        <div className="mt-6">
          <a
            href={`/${locale}/system/dashboard`}
            className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
          >
            {locale === "zh" ? "返回仪表�? : "Back to dashboard"}
          </a>
        </div>
      </div>
    </div>
  );
}

