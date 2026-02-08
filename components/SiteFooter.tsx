"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { FooterBrand } from "@/components/layout/FooterBrand";

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; items: FooterLink[] };

function isExternalLink(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href);
}

function BrandIcon({ className = "", path }: { className?: string; path: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function YoutubeIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
    />
  );
}

function DouyinIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
  );
}

function ZhihuIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M5.721 0C2.251 0 0 2.25 0 5.719V18.28C0 21.751 2.252 24 5.721 24h12.56C21.751 24 24 21.75 24 18.281V5.72C24 2.249 21.75 0 18.281 0zm1.964 4.078c-.271.73-.5 1.434-.68 2.11h4.587c.545-.006.445 1.168.445 1.171H9.384a58.104 58.104 0 01-.112 3.797h2.712c.388.023.393 1.251.393 1.266H9.183a9.223 9.223 0 01-.408 2.102l.757-.604c.452.456 1.512 1.712 1.906 2.177.473.681.063 2.081.063 2.081l-2.794-3.382c-.653 2.518-1.845 3.607-1.845 3.607-.523.468-1.58.82-2.64.516 2.218-1.73 3.44-3.917 3.667-6.497H4.491c0-.015.197-1.243.806-1.266h2.71c.024-.32.086-3.254.086-3.797H6.598c-.136.406-.158.447-.268.753-.594 1.095-1.603 1.122-1.907 1.155.906-1.821 1.416-3.6 1.591-4.064.425-1.124 1.671-1.125 1.671-1.125zM13.078 6h6.377v11.33h-2.573l-2.184 1.373-.401-1.373h-1.219zm1.313 1.219v8.86h.623l.263.937 1.455-.938h1.456v-8.86z"
    />
  );
}

function WeChatIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"
    />
  );
}

function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
    />
  );
}

function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
    />
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
    />
  );
}

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M13.5 3H16V0h-2.9C10.2 0 8.4 1.8 8.4 4.9V7H6v3h2.4v10h3.2V10h2.6l.4-3h-3V5c0-1 .4-2 1.9-2z"
    />
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      path="M20.5 3.5A10.9 10.9 0 0 0 3.1 17.7L2 22l4.4-1.1a10.9 10.9 0 0 0 5.2 1.4h.1A10.9 10.9 0 0 0 20.5 3.5zM11.6 20.2a9 9 0 0 1-4.6-1.3l-.3-.2-2.6.7.7-2.5-.2-.3a9 9 0 1 1 7 3.6zm5.2-6.7c-.3-.2-1.6-.8-1.9-.9-.3-.1-.5-.2-.7.2s-.8.9-1 .9-.4 0-.7-.2a7.4 7.4 0 0 1-2.2-1.3 8.1 8.1 0 0 1-1.5-1.9c-.2-.3 0-.5.1-.7l.5-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6 0-.2-.7-1.7-1-2.3-.3-.6-.6-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.1 1-1.1 2.4 1.1 2.8 1.2 3c.2.2 2.2 3.3 5.3 4.6.7.3 1.3.5 1.7.6.7.2 1.3.1 1.8.1.6-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.1-1.3-.1-.2-.3-.2-.6-.4z"
    />
  );
}

export function SiteFooter() {
  const tFooter = useTranslations("footer");
  const disclaimers = tFooter.raw("disclaimers") as unknown as string[];
  const columns = tFooter.raw("columns") as unknown as FooterColumn[];
  const quickLinks = tFooter.raw("quickLinks") as unknown as FooterLink[];
  const brandTags = tFooter.raw("brand.tags") as unknown as string[];

  const socials = [
    {
      key: "youtube",
      label: tFooter("social.youtube"),
      href: "https://www.youtube.com/",
      Icon: YoutubeIcon
    },
    {
      key: "douyin",
      label: tFooter("social.douyin"),
      href: "https://www.douyin.com/",
      Icon: DouyinIcon
    },
    {
      key: "zhihu",
      label: tFooter("social.zhihu"),
      href: "https://www.zhihu.com/",
      Icon: ZhihuIcon
    },
    {
      key: "wechat",
      label: tFooter("social.wechat"),
      href: "https://weixin.qq.com/",
      Icon: WeChatIcon
    },
    {
      key: "telegram",
      label: tFooter("social.telegram"),
      href: "https://t.me/",
      Icon: TelegramIcon
    },
    {
      key: "discord",
      label: tFooter("social.discord"),
      href: "https://discord.com/",
      Icon: DiscordIcon
    },
    {
      key: "x",
      label: tFooter("social.x"),
      href: "https://x.com/",
      Icon: XIcon
    },
    {
      key: "facebook",
      label: tFooter("social.facebook"),
      href: "https://www.facebook.com/",
      Icon: FacebookIcon
    },
    {
      key: "whatsapp",
      label: tFooter("social.whatsapp"),
      href: "https://www.whatsapp.com/",
      Icon: WhatsAppIcon
    }
  ];

  return (
    <footer className="site-footer border-t border-white/10 bg-slate-950/70">
      <div className="fx-container py-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="space-y-6">
            <FooterBrand />
            {Array.isArray(brandTags) ? (
              <div className="flex flex-wrap gap-2">
                {brandTags.map((tag) => (
                  <span key={tag} className="fx-pill border-white/10 text-slate-200/75">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Array.isArray(columns)
              ? columns.map((column) => (
                  <div key={column.title} className="space-y-3 text-sm text-slate-200/70">
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {column.title}
                    </div>
                    <div className="flex flex-col gap-2">
                      {column.items.map((item) =>
                        isExternalLink(item.href) ? (
                          <a
                            key={`${column.title}-${item.href}`}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-slate-50"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            key={`${column.title}-${item.href}`}
                            href={item.href}
                            className="hover:text-slate-50"
                          >
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                ))
              : null}
          </div>
        </div>

        <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-2 text-xs leading-6 text-slate-200/65">
            {Array.isArray(disclaimers)
              ? disclaimers.map((line) => <p key={line}>{line}</p>)
              : null}
          </div>

          <div className="space-y-4 lg:pl-6">
            <div className="flex flex-wrap gap-3 text-sm text-slate-200/70">
              {Array.isArray(quickLinks)
                ? quickLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="hover:text-slate-50">
                      {link.label}
                    </Link>
                  ))
                : null}
            </div>

            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                {tFooter("socialTitle")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {socials.map(({ key, href, label, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200/70 transition hover:border-sky-400/40 hover:text-slate-50"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-200/60 md:flex-row md:items-center md:justify-between">
          <span>{tFooter("copyright")}</span>
        </div>
      </div>
    </footer>
  );
}
