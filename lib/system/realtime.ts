export const SYSTEM_REALTIME_EVENT = "system:realtime";

export type SystemRealtimeDetail = {
  table?: string;
  action?: string;
  ts?: number;
};

export function dispatchSystemRealtime(detail?: SystemRealtimeDetail) {
  if (typeof window === "undefined") return;
  const payload: SystemRealtimeDetail = { ts: Date.now(), ...detail };
  window.dispatchEvent(new CustomEvent(SYSTEM_REALTIME_EVENT, { detail: payload }));
}
