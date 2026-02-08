"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";

import { Link } from "@/i18n/navigation";

function animationPreset(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 }
    };
  }
  return {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 }
  };
}

export function Hero() {
  const tHome = useTranslations("home");
  const reduceMotion = useReducedMotion();
  const preset = animationPreset(!!reduceMotion);

  const handleScrollToExplore = useCallback(() => {
    const target = document.getElementById("home-content");
    if (target) {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
      return;
    }

    window.scrollTo({
      top: window.innerHeight,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }, [reduceMotion]);

  return (
    <section className="relative overflow-hidden">
      <motion.div
        initial={preset.initial}
        animate={preset.animate}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-7xl flex-col px-6 py-10 lg:py-14"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="relative">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,160,255,.22)_0%,transparent_60%)] blur-2xl" />
            <Image
              src="/brand/logo-hero.svg"
              alt="FxLocus Trading"
              width={720}
              height={180}
              priority
              className="relative h-[84px] w-auto opacity-95 drop-shadow-[0_18px_80px_rgba(0,160,255,.28)] md:h-[110px] lg:h-[138px]"
              draggable={false}
            />
          </div>

          <p className="text-sm font-semibold tracking-[0.18em] text-rose-400/90 md:text-base">
            {tHome("hero.statement")}
          </p>

          <h1 className="fx-title-jump max-w-[28ch] text-balance text-3xl font-extrabold tracking-tight text-slate-50 md:text-4xl lg:text-5xl">
            {tHome("hero.title")}
          </h1>

          <div className="mt-1 flex flex-col items-center gap-3 sm:flex-row">
<Link
  href="/about"
  className="
    relative inline-flex items-center justify-center gap-2
    h-12 min-w-[184px] px-7
    rounded-xl
    text-[15px] font-semibold tracking-[0.8px]
    text-white/92
    bg-white/[0.06]
    border border-white/14
    shadow-[0_18px_60px_rgba(0,0,0,0.62)]
    backdrop-blur-md
    transition-all duration-200
    hover:bg-white/[0.08] hover:border-cyan-300/35 hover:-translate-y-[1px]
    hover:shadow-[0_22px_72px_rgba(0,0,0,0.70)]
    active:translate-y-0 active:shadow-[0_14px_50px_rgba(0,0,0,0.60)]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/25
  "
>
  {/* 顶部微高光，让按钮“精致”但不塑料 */}
  <span
    aria-hidden
    className="
      pointer-events-none absolute inset-0 rounded-xl
      bg-gradient-to-b from-white/10 via-transparent to-transparent
      opacity-70
    "
  />
  {/* 内圈细线，增加机构感层级 */}
  <span
    aria-hidden
    className="
      pointer-events-none absolute inset-0 rounded-[11px]
      ring-1 ring-white/5
    "
  />
  <span className="relative z-10">
    {tHome("hero.aboutCta")}
  </span>
  <span aria-hidden className="relative z-10 text-white/60 translate-y-[0.5px]">→</span>
</Link>


          </div>

        </div>

        <button
          type="button"
          onClick={handleScrollToExplore}
          className="group mx-auto mt-10 inline-flex flex-col items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold tracking-[0.22em] text-white/30 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
          aria-label={tHome("hero.scroll.aria")}
        >
          <span>{tHome("hero.scroll.label")}</span>
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-white/30 group-hover:text-white/60"
            aria-hidden="true"
            initial={reduceMotion ? false : { y: 0 }}
            animate={reduceMotion ? { y: 0 } : { y: [0, 6, 0] }}
            transition={reduceMotion ? undefined : { duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M12 5v12m0 0l-6-6m6 6l6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>
      </motion.div>
    </section>
  );
}
