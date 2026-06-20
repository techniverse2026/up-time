// Alerting stub — fires when a site transitions up<->down.
//
// Disabled by default. To enable, set ALERTS_ENABLED=true and provide a webhook
// (Slack/Discord-compatible) via ALERT_WEBHOOK_URL as a GitHub Actions secret.
// Email is left as a TODO (wire to an SMTP action or a provider's HTTP API).

export type Transition = "down" | "recovered";

export async function notify(opts: {
  transition: Transition;
  name: string;
  url: string;
  detail: string;
}): Promise<void> {
  const enabled = process.env.ALERTS_ENABLED === "true";
  if (!enabled) return;

  const webhook = process.env.ALERT_WEBHOOK_URL;
  const emoji = opts.transition === "down" ? "🔴" : "🟢";
  const verb = opts.transition === "down" ? "is DOWN" : "has RECOVERED";
  const text = `${emoji} ${opts.name} ${verb}\n${opts.url}\n${opts.detail}`;

  // --- Webhook (Slack / Discord both accept a JSON body with a "content"/"text" field) ---
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // "content" works for Discord; "text" for Slack. Send both — each ignores the other.
        body: JSON.stringify({ content: text, text }),
      });
    } catch (err) {
      console.warn(`[alert] webhook failed: ${(err as Error).message}`);
    }
  }

  // --- TODO: Email alerting ---
  // e.g. POST to a transactional email API (Resend/SendGrid/Mailgun) using
  // ALERT_EMAIL_TO + a provider API key secret, or use an SMTP GitHub Action.

  console.log(`[alert] ${text.replace(/\n/g, " | ")}`);
}
