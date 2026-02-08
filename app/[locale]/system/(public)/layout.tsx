import React from "react";
import { unstable_noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "系统" };

export default function SystemPublicLayout({ children }: { children: React.ReactNode }) {
  unstable_noStore();
  return (
    <div className="min-h-[100dvh] w-full overflow-hidden bg-[color:var(--bg)]">
      {children}
    </div>
  );
}
