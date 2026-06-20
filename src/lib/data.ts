import type { SiteHistory, StatusSnapshot } from "../types";

// All data lives under <base>/data/. BASE_URL is "/" in dev and "/up-time/"
// (or whatever the host needs) in the production build.
const base = import.meta.env.BASE_URL;

function dataUrl(p: string): string {
  // Cache-bust so a freshly committed snapshot shows up without a hard refresh.
  const bust = `t=${Math.floor(Date.now() / 60000)}`;
  return `${base}data/${p}${p.includes("?") ? "&" : "?"}${bust}`;
}

export async function fetchStatus(): Promise<StatusSnapshot> {
  const res = await fetch(dataUrl("status.json"));
  if (!res.ok) throw new Error(`Failed to load status.json (${res.status})`);
  return (await res.json()) as StatusSnapshot;
}

export async function fetchHistory(id: string): Promise<SiteHistory> {
  const res = await fetch(dataUrl(`history/${id}.json`));
  if (!res.ok) throw new Error(`Failed to load history for ${id} (${res.status})`);
  return (await res.json()) as SiteHistory;
}
