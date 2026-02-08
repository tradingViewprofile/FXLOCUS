"use client";

import React from "react";

const TRADINGVIEW_ERROR_MESSAGE = "Cannot listen to the event from the frame";
const TRADINGVIEW_IFRAME_ERROR_FRAGMENT = "contentWindow is not available";
const TRADINGVIEW_SCRIPT_HINT = "tradingview";
const TRADINGVIEW_SUPPORT_HOSTS = new Set(["www.tradingview-widget.com", "s.tradingview.com"]);
const TRADINGVIEW_SUPPORT_PATH = "/support/support-portal-problems/";
const TRADINGVIEW_SUPPORT_FALLBACK = "https://s.tradingview.com";
const TRADINGVIEW_ERROR_FRAGMENTS = [
  TRADINGVIEW_IFRAME_ERROR_FRAGMENT,
  "Cannot listen to the event from the provided iframe",
  "support portal problems",
  "support-portal-problems",
  "Chart.DataProblemModel"
];
const TRADINGVIEW_WARN_FRAGMENTS = [
  "Invalid environment undefined",
  "snowplow-embed-widget"
];
let tradingViewErrorHandlerCount = 0;
let tradingViewErrorHandler: ((event: ErrorEvent) => void) | null = null;
let tradingViewConsoleFilterCount = 0;
let originalConsoleError: typeof console.error | null = null;
let originalConsoleWarn: typeof console.warn | null = null;
let tradingViewFetchFilterCount = 0;
let originalFetch: typeof window.fetch | null = null;
const TRADINGVIEW_SCRIPT_HOST_OVERRIDE = (process.env.NEXT_PUBLIC_TRADINGVIEW_SCRIPT_HOST || "").trim();

function normalizeHost(host: string) {
  return host.replace(/\/+$/, "");
}

function buildScriptCandidates(src: string) {
  const candidates: string[] = [];
  const push = (value: string) => {
    if (!value || candidates.includes(value)) return;
    candidates.push(value);
  };

  push(src);

  if (TRADINGVIEW_SCRIPT_HOST_OVERRIDE) {
    try {
      const url = new URL(src);
      const override = normalizeHost(TRADINGVIEW_SCRIPT_HOST_OVERRIDE);
      const next = new URL(`${url.pathname}${url.search}`, override).toString();
      push(next);
    } catch {
      // ignore override parse errors
    }
  }

  try {
    const url = new URL(src);
    if (url.hostname === "s3.tradingview.com") {
      url.hostname = "s.tradingview.com";
      push(url.toString());
    }
  } catch {
    // ignore parse errors
  }

  return candidates;
}

function attachTradingViewErrorHandler() {
  if (typeof window === "undefined") return () => {};

  if (!tradingViewErrorHandler) {
    tradingViewErrorHandler = (event: ErrorEvent) => {
      const message = event.message || "";
      const filename = event.filename || "";
      if (message.includes(TRADINGVIEW_IFRAME_ERROR_FRAGMENT)) {
        event.preventDefault();
        return;
      }
      if (
        message.includes(TRADINGVIEW_ERROR_MESSAGE) &&
        (filename.includes(TRADINGVIEW_SCRIPT_HINT) || filename.includes("embed-widget"))
      ) {
        event.preventDefault();
      }
    };
  }

  tradingViewErrorHandlerCount += 1;
  if (tradingViewErrorHandlerCount === 1) {
    window.addEventListener("error", tradingViewErrorHandler, true);
  }

  return () => {
    tradingViewErrorHandlerCount = Math.max(0, tradingViewErrorHandlerCount - 1);
    if (tradingViewErrorHandlerCount === 0 && tradingViewErrorHandler) {
      window.removeEventListener("error", tradingViewErrorHandler, true);
    }
  };
}

function consoleArgsContainFragments(args: unknown[], fragments: string[]) {
  return args.some((arg) => {
    const text =
      typeof arg === "string"
        ? arg
        : arg instanceof Error
          ? arg.message
          : typeof arg === "object" && arg && "message" in arg
            ? String((arg as { message?: unknown }).message ?? "")
            : String(arg);
    return fragments.some((fragment) => text.includes(fragment));
  });
}

function shouldIgnoreTradingViewConsoleError(args: unknown[]) {
  return consoleArgsContainFragments(args, TRADINGVIEW_ERROR_FRAGMENTS);
}

function shouldIgnoreTradingViewConsoleWarn(args: unknown[]) {
  return consoleArgsContainFragments(args, TRADINGVIEW_WARN_FRAGMENTS);
}

function attachTradingViewConsoleFilter() {
  if (typeof window === "undefined") return () => {};

  tradingViewConsoleFilterCount += 1;
  if (tradingViewConsoleFilterCount === 1) {
    originalConsoleError = originalConsoleError ?? console.error;
    originalConsoleWarn = originalConsoleWarn ?? console.warn;
    console.error = (...args: unknown[]) => {
      if (shouldIgnoreTradingViewConsoleError(args)) return;
      if (originalConsoleError) {
        originalConsoleError(...args);
      }
    };
    console.warn = (...args: unknown[]) => {
      if (shouldIgnoreTradingViewConsoleWarn(args)) return;
      if (originalConsoleWarn) {
        originalConsoleWarn(...args);
      }
    };
  }

  return () => {
    tradingViewConsoleFilterCount = Math.max(0, tradingViewConsoleFilterCount - 1);
    if (tradingViewConsoleFilterCount === 0 && originalConsoleError) {
      console.error = originalConsoleError;
    }
    if (tradingViewConsoleFilterCount === 0 && originalConsoleWarn) {
      console.warn = originalConsoleWarn;
    }
  };
}

function matchesTradingViewSupportUrl(input: RequestInfo | URL) {
  if (typeof window === "undefined") return false;
  let raw = "";
  if (typeof input === "string") {
    raw = input;
  } else if (typeof URL !== "undefined" && input instanceof URL) {
    raw = input.toString();
  } else if (typeof Request !== "undefined" && input instanceof Request) {
    raw = input.url;
  } else {
    raw = String(input);
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    return TRADINGVIEW_SUPPORT_HOSTS.has(parsed.hostname) && parsed.pathname.startsWith(TRADINGVIEW_SUPPORT_PATH);
  } catch {
    return false;
  }
}

function createTradingViewSupportResponse() {
  if (typeof Response === "undefined") {
    return Promise.resolve({ ok: true, status: 200 } as Response);
  }
  const payload = JSON.stringify({ problems: [] });
  return Promise.resolve(
    new Response(payload, {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  );
}

function attachTradingViewNetworkFilter() {
  if (typeof window === "undefined" || typeof window.fetch === "undefined") return () => {};

  tradingViewFetchFilterCount += 1;
  if (tradingViewFetchFilterCount === 1) {
    originalFetch = originalFetch ?? window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (matchesTradingViewSupportUrl(input)) {
        return createTradingViewSupportResponse();
      }
      return originalFetch ? originalFetch(input, init) : fetch(input, init);
    }) as typeof window.fetch;
  }

  return () => {
    tradingViewFetchFilterCount = Math.max(0, tradingViewFetchFilterCount - 1);
    if (tradingViewFetchFilterCount === 0 && originalFetch) {
      window.fetch = originalFetch;
    }
  };
}

type Props = {
  scriptSrc: string;
  options: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
  depsKey: string;
  height?: number | string;
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
};

export function TradingViewWidget({
  scriptSrc,
  options,
  className = "",
  style,
  depsKey,
  height = "100%",
  onStatusChange
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);
  const [scriptIndex, setScriptIndex] = React.useState(0);

  const scriptCandidates = React.useMemo(() => buildScriptCandidates(scriptSrc), [scriptSrc]);
  const optionsJson = React.useMemo(() => {
    const base = options ?? {};
    const supportHost =
      typeof (base as { support_host?: unknown }).support_host === "string" &&
      String((base as { support_host?: unknown }).support_host).trim()
        ? (base as { support_host?: unknown }).support_host
        : TRADINGVIEW_SUPPORT_FALLBACK;
    return JSON.stringify({ ...base, support_host: supportHost });
  }, [options]);

  React.useEffect(() => {
    const detachError = attachTradingViewErrorHandler();
    const detachConsole = attachTradingViewConsoleFilter();
    const detachNetwork = attachTradingViewNetworkFilter();
    return () => {
      detachNetwork();
      detachConsole();
      detachError();
    };
  }, []);

  React.useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  React.useEffect(() => {
    setScriptIndex(0);
  }, [scriptSrc]);

  React.useEffect(() => {
    const host = ref.current;
    if (!host) return;

    setStatus("loading");
    host.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = typeof height === "number" ? `${height}px` : String(height);
    container.style.width = "100%";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    const scriptUrl = scriptCandidates[scriptIndex] || scriptSrc;
    script.src = scriptUrl;
    script.setAttribute("override-host", TRADINGVIEW_SUPPORT_FALLBACK);
    script.innerHTML = optionsJson;

    let alive = true;
    const handleFailure = () => {
      if (!alive) return;
      if (scriptIndex < scriptCandidates.length - 1) {
        setScriptIndex((idx) => Math.min(idx + 1, scriptCandidates.length - 1));
        setAttempt((value) => value + 1);
        return;
      }
      setStatus("error");
    };
    const timeoutId = window.setTimeout(() => {
      handleFailure();
    }, 8000);

    const handleLoad = () => {
      if (!alive) return;
      window.clearTimeout(timeoutId);
      setStatus("ready");
    };

    const handleError = () => {
      if (!alive) return;
      window.clearTimeout(timeoutId);
      handleFailure();
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    container.appendChild(widget);
    container.appendChild(script);

    host.appendChild(container);

    return () => {
      alive = false;
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      host.innerHTML = "";
    };
  }, [scriptSrc, scriptCandidates, scriptIndex, optionsJson, height, attempt, depsKey]);

  return (
    <div className={`relative ${className}`} style={{ ...style, width: "100%" }}>
      <div ref={ref} className="h-full w-full" />
      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4 text-center">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-black/80 p-4 text-sm text-white/80 shadow-xl">
            <div className="font-semibold text-white">TradingView failed to load.</div>
            <div className="mt-1 text-xs text-white/60">
              Check your network and try again.
            </div>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-3 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
