// Generates a static "uptime" status badge (SVG) per site, shields.io-style.
// Written to public/data/badges/<id>.svg by the checker. Embed in a README with:
//   ![uptime](https://<user>.github.io/<repo>/data/badges/<id>.svg)

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Approximate text width for the 11px Verdana used by shields-style badges. */
function textWidth(s: string): number {
  return s.length * 6.5 + 10;
}

export function uptimeBadge(opts: {
  label: string;
  status: "up" | "down" | "unknown";
  uptimePct: number | null;
}): string {
  const { label } = opts;
  const value =
    opts.uptimePct === null
      ? opts.status === "up"
        ? "up"
        : opts.status
      : `${opts.uptimePct}%`;

  const color =
    opts.status === "down"
      ? "#e05d44" // red
      : opts.uptimePct !== null && opts.uptimePct < 99
        ? "#dfb317" // yellow
        : "#4c1"; // green

  const lw = Math.round(textWidth(label));
  const vw = Math.round(textWidth(value));
  const w = lw + vw;
  const lx = lw / 2;
  const vx = lw + vw / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <title>${esc(label)}: ${esc(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${vw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lx}" y="15" fill="#010101" fill-opacity=".3">${esc(label)}</text>
    <text x="${lx}" y="14">${esc(label)}</text>
    <text x="${vx}" y="15" fill="#010101" fill-opacity=".3">${esc(value)}</text>
    <text x="${vx}" y="14">${esc(value)}</text>
  </g>
</svg>`;
}
