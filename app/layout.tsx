import type { Metadata } from "next";
import "./globals.css";

import { Inter } from "next/font/google";

import { WebVitals } from "@/components/monitoring/WebVitals";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
    shortcut: ["/favicon.ico"],
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      className={["font-zh", inter.variable].join(" ")}
      suppressHydrationWarning
    >
      <head>
        <meta name="msvalidate.01" content="BE1072522344010B386F044BDDEE4A37" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
