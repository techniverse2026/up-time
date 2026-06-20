# Uptime Tracker

A **free, self-hosted website uptime tracker**. It monitors one or more sites from
GitHub Actions, stores the results as JSON committed back into this repo (the git repo
_is_ the database — no server, no DB to host), and renders a clean status dashboard as a
static React app on GitHub Pages.

No paid monitoring services. No backend. Just Actions + JSON + a static page.

![uptime](https://techniverse2026.github.io/up-time/data/badges/lokeshworsaccos.svg)

> **Live dashboard:** https://techniverse2026.github.io/up-time/ (after the first deploy)

---

## How it works

```
                 every ~5 min (cron)
GitHub Actions ───────────────────────►  scripts/check.ts pings each site
   (monitor.yml)                              │
                                              ▼
                          public/data/*.json  ◄── committed back to the repo
                                              │       (the "database")
                                              ▼
GitHub Actions ───────────────────────►  builds the React app, publishes to
   (deploy.yml)                              GitHub Pages  ──►  the dashboard
                                                                reads those JSON files
```

The **checker** (writer) and the **dashboard** (reader) are fully decoupled — they only
share the JSON files under `public/data/`. A site can't measure its own uptime, so the
checks run from GitHub's infrastructure, independent of the monitored sites.

### Data model

| File | Purpose |
| --- | --- |
| `config/sites.json` | The sites to monitor. **The only file you edit to add a site.** |
| `public/data/status.json` | Latest snapshot for all sites (status, response time, uptime %). |
| `public/data/history/<id>.json` | Per-site rolling history: raw checks (7 days), daily rollups (90 days), incidents. |
| `public/data/badges/<id>.svg` | A shields-style uptime badge per site. |

History files stay small forever: 24h/7d uptime is computed from raw checks, 30d from
daily rollups, and old data is trimmed automatically each run.

---

## Add or change a site

Edit **`config/sites.json`** — nothing else:

```jsonc
{
  "sites": [
    {
      "id": "lokeshworsaccos",          // optional; auto-derived from the URL if omitted
      "name": "Lokeshwor SACCOS",        // shown on the dashboard
      "url": "https://lokeshworsaccos.com.np",
      "expectedStatus": 200              // optional; default = any 2xx/3xx counts as "up"
    },
    {
      "name": "My Other Site",
      "url": "https://example.com"
    }
  ]
}
```

Commit the change. The next monitor run picks it up and the dashboard updates.

---

## Setup (fork / new repo)

1. **Use a _public_ repo.** GitHub Actions minutes are free and unlimited on public repos.
   A 5-minute cadence on a private repo would blow past the free 2,000 min/month. A status
   page is public information anyway. (This repo is `techniverse2026/up-time`.)

2. **Enable GitHub Pages:** repo **Settings → Pages → Build and deployment → Source:
   GitHub Actions**. The `deploy.yml` workflow handles the rest.

3. **Set the base path** to match your repo name. In `.github/workflows/deploy.yml` the
   build step sets:
   ```yaml
   env:
     BASE_PATH: "/up-time/"   # = "/<repo-name>/" for a GitHub Pages project site
   ```
   For a root custom domain, Vercel, or Netlify, set it to `"/"` instead.

4. **Let Actions write to the repo:** **Settings → Actions → General → Workflow
   permissions → Read and write permissions.** (The workflow also declares
   `permissions: contents: write`.)

5. **Trigger the first run:** push to `main`, or open the **Actions** tab → **Monitor
   sites** → **Run workflow**. After it commits data, **Deploy dashboard** runs and your
   page goes live.

The cron is `*/5 * * * *`. GitHub's scheduler is not exact — it can drift a few minutes
and 5 minutes is the floor. That's expected and fine for uptime monitoring.

---

## Local development

```bash
npm install
npm run check     # run the checker once; writes public/data/*
npm run dev       # start the dashboard at http://localhost:5173
npm run build     # production build into dist/
```

`npm run check` works locally exactly as it does in CI — handy for seeding data or
debugging a site that won't come up.

---

## Deploy elsewhere (host-agnostic)

The dashboard is a plain static site and reads data via a relative `BASE_URL`, so it runs
anywhere:

- **GitHub Pages** — already wired up (`deploy.yml`).
- **Vercel / Netlify** — set the build command to `npm run build`, output dir `dist`, and
  `BASE_PATH=/` (root). Point a custom domain like `status.thetechniverse.com` at it — a
  one-time DNS + host setting; no code changes.

Because the data is committed into the repo and copied into the build, the deployed site
is self-contained — no CORS, no `raw.githubusercontent` coupling.

---

## Optional: alerting

Notifications on up→down / down→up transitions are stubbed in `scripts/alert.ts`,
**disabled by default**. To enable a Slack/Discord webhook:

1. Add a repo secret `ALERT_WEBHOOK_URL` (an incoming-webhook URL).
2. In `.github/workflows/monitor.yml`, uncomment the `env:` block on the **Run checker**
   step (`ALERTS_ENABLED: "true"` + the secret).

Email alerting is left as a `TODO` in `alert.ts` (wire to Resend/SendGrid/Mailgun or an
SMTP action).

---

## Status badges

Each run writes `public/data/badges/<id>.svg`. Embed one anywhere:

```md
![uptime](https://techniverse2026.github.io/up-time/data/badges/<id>.svg)
```

---

## Tech stack

Vite · React · TypeScript · Tailwind CSS · Recharts · Node (checker) · GitHub Actions ·
GitHub Pages.

Re-skin in seconds: change the `brand` color in `tailwind.config.js`.
