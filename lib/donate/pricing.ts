import "server-only";

import { dbFirst, dbRun } from "@/lib/db/d1";

export const DONATE_PRICE_BASE = 999;
export const DONATE_PRICE_CURRENT = 1555;
export const DONATE_DAILY_INCREASE = 5;

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

type MetricsRow = {
  key: string;
  base_amount: number | null;
  current_amount: number | null;
  daily_increase: number | null;
  last_increment_date: string | null;
  updated_at?: string | null;
};

const METRICS_KEY = "global";

function toDateKeyBeijing(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKeyUtcMs(value: string) {
  const [y, m, d] = value.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
}

function isValidDateKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function beijingMidnightUtcFromKey(key: string) {
  const [y, m, d] = key.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - BEIJING_OFFSET_MS;
}

export async function getDonatePrice() {
  const now = new Date();
  const dayKey = toDateKeyBeijing(now);
  const midnightUtcMs = beijingMidnightUtcFromKey(dayKey);
  const nextUpdateAt = midnightUtcMs
    ? new Date(midnightUtcMs + 86_400_000).toISOString()
    : new Date(now.getTime() + 86_400_000).toISOString();

  const row = await dbFirst<MetricsRow>(
    `select key, base_amount, current_amount, daily_increase, last_increment_date, updated_at
     from donation_metrics
     where key = ?
     limit 1`,
    [METRICS_KEY]
  );

  if (!row) {
    const payload = {
      key: METRICS_KEY,
      base_amount: DONATE_PRICE_BASE,
      current_amount: DONATE_PRICE_CURRENT,
      daily_increase: DONATE_DAILY_INCREASE,
      last_increment_date: dayKey,
      updated_at: now.toISOString()
    };
    await dbRun(
      `insert into donation_metrics
        (key, base_amount, current_amount, daily_increase, last_increment_date, updated_at)
       values
        (?, ?, ?, ?, ?, ?)`,
      [
        payload.key,
        payload.base_amount,
        payload.current_amount,
        payload.daily_increase,
        payload.last_increment_date,
        payload.updated_at
      ]
    );
    return { price: DONATE_PRICE_CURRENT, priceDate: dayKey, nextUpdateAt };
  }

  const baseAmount = Number(row.base_amount ?? DONATE_PRICE_BASE);
  const dailyIncrease = Number(row.daily_increase ?? DONATE_DAILY_INCREASE);
  let currentAmount = Number(
    row.current_amount ?? (Number.isFinite(baseAmount) ? baseAmount : DONATE_PRICE_CURRENT)
  );
  if (!Number.isFinite(currentAmount)) currentAmount = DONATE_PRICE_CURRENT;

  const lastKey = isValidDateKey(row.last_increment_date) ? row.last_increment_date : dayKey;
  const lastUtcMs = parseDateKeyUtcMs(lastKey || "");
  const currentUtcMs = parseDateKeyUtcMs(dayKey);
  if (lastUtcMs !== null && currentUtcMs !== null && lastKey !== dayKey) {
    const diffDays = Math.max(0, Math.floor((currentUtcMs - lastUtcMs) / 86_400_000));
    if (diffDays > 0) {
      currentAmount += diffDays * dailyIncrease;
      await dbRun(
        `update donation_metrics
         set base_amount = ?,
             current_amount = ?,
             daily_increase = ?,
             last_increment_date = ?,
             updated_at = ?
         where key = ?`,
        [baseAmount, currentAmount, dailyIncrease, dayKey, now.toISOString(), METRICS_KEY]
      );
    }
  }

  return { price: currentAmount, priceDate: dayKey, nextUpdateAt };
}

