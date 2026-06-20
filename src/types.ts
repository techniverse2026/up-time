// Shared data contracts between the checker (writer) and dashboard (reader).
// Keep this file dependency-free so both Node and the browser can import it.

export interface SiteConfig {
  /** Stable slug used for the history filename. Auto-derived from url if omitted. */
  id?: string;
  name: string;
  url: string;
  /** If set, the site is "up" only when the response status equals this. */
  expectedStatus?: number;
}

export interface SitesFile {
  sites: SiteConfig[];
}

/** One ping result. Keys are short to keep the JSON small over thousands of rows. */
export interface Check {
  /** UTC ISO timestamp. */
  t: string;
  /** Was the site considered up? */
  ok: boolean;
  /** HTTP status code, or 0 on network error / timeout. */
  status: number;
  /** Response time in milliseconds. */
  ms: number;
}

/** Per-day rollup, used for long-window (30d) uptime without keeping raw rows forever. */
export interface DailyRollup {
  /** UTC date, YYYY-MM-DD. */
  date: string;
  up: number;
  total: number;
  /** Average response time (ms) across the day's checks. */
  avgMs: number;
}

export interface Incident {
  /** UTC ISO timestamp the site first went down. */
  start: string;
  /** UTC ISO timestamp it recovered, or null if still down. */
  end: string | null;
  /** Duration in ms (null while ongoing). */
  durationMs: number | null;
}

/** Bounded, per-site history file: public/data/history/<id>.json */
export interface SiteHistory {
  id: string;
  name: string;
  url: string;
  /** Raw checks, trimmed to the last 7 days. */
  checks: Check[];
  /** Daily rollups, trimmed to the last 90 days. */
  daily: DailyRollup[];
  /** Most recent incidents first; trimmed to a sensible cap. */
  incidents: Incident[];
}

export type Status = "up" | "down" | "unknown";

export interface UptimeWindows {
  "24h": number | null;
  "7d": number | null;
  "30d": number | null;
}

/** One entry in the top-level snapshot: public/data/status.json */
export interface SiteStatus {
  id: string;
  name: string;
  url: string;
  status: Status;
  httpStatus: number;
  responseTime: number;
  lastChecked: string;
  uptime: UptimeWindows;
  lastError: string | null;
  /** Whether the site is currently in an open incident. */
  ongoingIncidentSince: string | null;
}

export interface StatusSnapshot {
  /** UTC ISO timestamp this snapshot was generated. */
  generatedAt: string;
  sites: SiteStatus[];
}
