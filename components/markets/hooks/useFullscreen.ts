"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

export function useFullscreen(target: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement;
      setIsFullscreen(Boolean(el && el === target.current));
    };

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [target]);

  const enter = async () => {
    const el = target.current;
    if (!el) return;
    if (document.fullscreenElement) return;
    await el.requestFullscreen();
  };

  const exit = async () => {
    if (!document.fullscreenElement) return;
    await document.exitFullscreen();
  };

  const toggle = async () => {
    if (document.fullscreenElement) return exit();
    return enter();
  };

  return { isFullscreen, enter, exit, toggle };
}
