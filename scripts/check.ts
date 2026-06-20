// The checker. Run by GitHub Actions every 5 minutes (or locally via `npm run check`).
//
// For each configured site it performs one HTTP request, records the result into a
// bounded per-site history file, recomputes uptime windows, and writes a top-level
// status snapshot. Designed to be resilient: one site failing (or being down) never
// fails the whole run or corrupts the JSON.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  Check,
  DailyRollup,
  SiteConfig,
  SiteHistory,
  SitesFile,
  SiteStatus,
  StatusSnapshot,
  Status,
} from "../src/types.ts";
import {
  computeUptimeWindows,
  deriveId,
  MS,
  round2,
  utcDate,
} from "../src/lib/uptime.ts";
import { notify } from "./alert.ts";
import { uptimeBadge } from "./badge.ts";

const TIMEOUT_MS = 10_000;
const RAW_RETENTION_DAYS = 7;
const DAILY_RETENTION_DAYS = 90;
const MAX_INCIDENTS = 50;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "sites.json");
const DATA_DIR = path.join(ROOT, "public", "data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const BADGE_DIR = path.join(DATA_DIR, "badges");
const STATUS_PATH = path.join(DATA_DIR, "status.json");

async function main() {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const config = await readConfig();
  if (config.sites.length === 0) {
    console.warn("No sites configured in config/sites.json — nothing to check.");
  }

  await fs.mkdir(HISTORY_DIR, { recursive: true });
  await fs.mkdir(BADGE_DIR, { recursive: true });

  const statuses: SiteStatus[] = [];

  for (const site of config.sites) {
    try {
      const status = await checkSite(site, now, nowIso);
      statuses.push(status);
    } catch (err) {
      // Should never reach here (checkSite is itself guarded), but never let one
      // site abort the whole run.
      console.error(`[check] unexpected error for ${site.url}: ${(err as Error).message}`);
    }
  }

  const snapshot: StatusSnapshot = { generatedAt: nowIso, sites: statuses };
  await writeJson(STATUS_PATH, snapshot);

  const down = statuses.filter((s) => s.status === "down").length;
  console.log(
    `Checked ${statuses.length} site(s) at ${nowIso} — ${down} down, ${statuses.length - down} up.`,
  );
}

async function checkSite(site: SiteConfig, now: number, nowIso: string): Promise<SiteStatus> {
  const id = site.id || deriveId(site.url);
  const history = await loadHistory(id, site);

  const prevOk = history.checks.length ? history.checks[history.checks.length - 1].ok : null;

  const { ok, status, ms, error } = await ping(site);
  const check: Check = { t: nowIso, ok, status, ms };
  history.checks.push(check);

  // --- Incident transitions ---
  const openIncident = history.incidents.find((i) => i.end === null);
  if (!ok) {
    if (!openIncident) {
      history.incidents.unshift({ start: nowIso, end: null, durationMs: null });
      if (prevOk !== false) {
        await notify({
          transition: "down",
          name: site.name,
          url: site.url,
          detail: error ? `Error: ${error}` : `HTTP ${status}`,
        });
      }
    }
  } else if (openIncident) {
    openIncident.end = nowIso;
    openIncident.durationMs = now - Date.parse(openIncident.start);
    await notify({
      transition: "recovered",
      name: site.name,
      url: site.url,
      detail: `Down for ~${Math.round(openIncident.durationMs / 60000)}m`,
    });
  }

  // --- Bound the data so files never grow forever ---
  history.checks = trimChecks(history.checks, now);
  history.daily = updateDaily(history.daily, history.checks, now);
  history.incidents = history.incidents.slice(0, MAX_INCIDENTS);

  await writeJson(path.join(HISTORY_DIR, `${id}.json`), history);

  const finalStatus: Status = ok ? "up" : "down";
  const stillOpen = history.incidents.find((i) => i.end === null);
  const uptime = computeUptimeWindows(history.checks, history.daily, now);

  // Status badge (SVG) — uses the 24h window, falling back to 7d/30d.
  const badgePct = uptime["24h"] ?? uptime["7d"] ?? uptime["30d"];
  await fs.writeFile(
    path.join(BADGE_DIR, `${id}.svg`),
    uptimeBadge({ label: "uptime", status: finalStatus, uptimePct: badgePct }),
    "utf8",
  );

  return {
    id,
    name: site.name,
    url: site.url,
    status: finalStatus,
    httpStatus: status,
    responseTime: ms,
    lastChecked: nowIso,
    uptime,
    lastError: error,
    ongoingIncidentSince: stillOpen ? stillOpen.start : null,
  };
}

/** Perform one guarded HTTP request with a hard timeout. Never throws. */
async function ping(
  site: SiteConfig,
): Promise<{ ok: boolean; status: number; ms: number; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(site.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "uptime-tracker (+https://github.com/) checker" },
    });
    const ms = Date.now() - started;
    const ok = site.expectedStatus
      ? res.status === site.expectedStatus
      : res.status >= 200 && res.status < 400;
    return {
      ok,
      status: res.status,
      ms,
      error: ok ? null : `Unexpected status ${res.status}`,
    };
  } catch (err) {
    const ms = Date.now() - started;
    const e = err as Error;
    const isTimeout = e.name === "AbortError";
    return {
      ok: false,
      status: 0,
      ms,
      error: isTimeout ? `Timeout after ${TIMEOUT_MS}ms` : e.message || "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

function trimChecks(checks: Check[], now: number): Check[] {
  const cutoff = now - RAW_RETENTION_DAYS * MS.day;
  return checks.filter((c) => Date.parse(c.t) >= cutoff);
}

/** Rebuild today's rollup from raw checks; keep older rollups; trim to retention. */
function updateDaily(daily: DailyRollup[], checks: Check[], now: number): DailyRollup[] {
  const today = utcDate(now);
  const todayChecks = checks.filter((c) => c.t.slice(0, 10) === today);

  const byDate = new Map(daily.map((d) => [d.date, d]));
  if (todayChecks.length) {
    const up = todayChecks.filter((c) => c.ok).length;
    const avgMs = round2(
      todayChecks.reduce((sum, c) => sum + c.ms, 0) / todayChecks.length,
    );
    byDate.set(today, { date: today, up, total: todayChecks.length, avgMs });
  }

  const cutoff = utcDate(now - DAILY_RETENTION_DAYS * MS.day);
  return [...byDate.values()]
    .filter((d) => d.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function loadHistory(id: string, site: SiteConfig): Promise<SiteHistory> {
  const file = path.join(HISTORY_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteHistory>;
    return {
      id,
      name: site.name,
      url: site.url,
      checks: Array.isArray(parsed.checks) ? parsed.checks : [],
      daily: Array.isArray(parsed.daily) ? parsed.daily : [],
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
    };
  } catch {
    // Missing or corrupt file → start fresh rather than crashing.
    return { id, name: site.name, url: site.url, checks: [], daily: [], incidents: [] };
  }
}

async function readConfig(): Promise<SitesFile> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as SitesFile;
  if (!parsed || !Array.isArray(parsed.sites)) {
    throw new Error("config/sites.json must contain a { sites: [...] } array.");
  }
  return parsed;
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

main().catch((err) => {
  console.error("Fatal error in checker:", err);
  process.exit(1);
});
