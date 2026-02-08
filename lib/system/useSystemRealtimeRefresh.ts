"use client";

import React from "react";

import { SYSTEM_REALTIME_EVENT } from "@/lib/system/realtime";

export function useSystemRealtimeRefresh(handler: () => void, throttleMs = 800) {
  const handlerRef = React.useRef(handler);
  const lastRef = React.useRef(0);

  React.useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const onEvent = () => {
      const now = Date.now();
      if (now - lastRef.current < throttleMs) return;
      lastRef.current = now;
      handlerRef.current();
    };
    window.addEventListener(SYSTEM_REALTIME_EVENT, onEvent);
    return () => {
      window.removeEventListener(SYSTEM_REALTIME_EVENT, onEvent);
    };
  }, [throttleMs]);
}
