"use client";

import { useEffect } from "react";
import { onCLS, onFID, onLCP, type Metric } from "web-vitals";

function log(metric: Metric) {
  // Required: output to console. Keep the payload for debugging.
  // eslint-disable-next-line no-console
  console.log("[WebVitals]", metric.name, metric.value, metric);
}

export function WebVitals() {
  useEffect(() => {
    onLCP(log);
    onFID(log);
    onCLS(log);
  }, []);

  return null;
}

