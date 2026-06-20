import type { Check, DailyRollup, UptimeWindows } from "../types";

export const MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

/** Slug a URL/name into a filesystem-safe id. */
export function deriveId(input: string): string {
  return input
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64) || "site";
}

/** UTC date string (YYYY-MM-DD) for a given epoch ms. */
export function utcDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Uptime % over the last `windowMs`, computed from raw checks. null if no data. */
export function uptimeFromChecks(
  checks: Check[],
  windowMs: number,
  now: number,
): number | null {
  const cutoff = now - windowMs;
  let up = 0;
  let total = 0;
  for (const c of checks) {
    if (Date.parse(c.t) >= cutoff) {
      total++;
      if (c.ok) up++;
    }
  }
  if (total === 0) return null;
  return round2((up / total) * 100);
}

/** Uptime % over the last `days`, computed from daily rollups. null if no data. */
export function uptimeFromDaily(
  daily: DailyRollup[],
  days: number,
  now: number,
): number | null {
  const cutoff = utcDate(now - days * MS.day);
  let up = 0;
  let total = 0;
  for (const d of daily) {
    if (d.date >= cutoff) {
      up += d.up;
      total += d.total;
    }
  }
  if (total === 0) return null;
  return round2((up / total) * 100);
}

/** Compute the 24h / 7d / 30d windows. 30d prefers daily rollups, falls back to raw. */
export function computeUptimeWindows(
  checks: Check[],
  daily: DailyRollup[],
  now: number,
): UptimeWindows {
  return {
    "24h": uptimeFromChecks(checks, MS.day, now),
    "7d": uptimeFromChecks(checks, 7 * MS.day, now),
    "30d": uptimeFromDaily(daily, 30, now) ?? uptimeFromChecks(checks, 30 * MS.day, now),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format a duration in ms as a short human string, e.g. "1h 5m", "3m", "45s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return "<1s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h && sec) parts.push(`${sec}s`);
  return parts.slice(0, 2).join(" ") || "0s";
}
