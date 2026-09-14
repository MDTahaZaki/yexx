// Single place any form submission (wholesale, newsletter, ...) goes
// through server-side, so wiring in a real destination later is a one-line
// env var change rather than a code change.

export type LeadKind = "wholesale" | "newsletter" | "order" | "preorder";

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Always logs first — this alone satisfies "nothing is lost," and it can't
 * fail. Then, if LEAD_WEBHOOK_URL is configured, best-effort forwards the
 * submission there (a Zapier/Make/Google-Sheets-webapp URL). Forwarding
 * failure never surfaces to the caller — the log above is already the
 * record — but is distinguished in server logs from "not configured yet" so
 * the two are easy to tell apart in ops.
 */
export async function sendLead(kind: LeadKind, data: Record<string, unknown>) {
  const submittedAt = new Date().toISOString();
  console.log(`[lead:${kind}]`, { ...data, submittedAt });

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(`[lead:${kind}] LEAD_WEBHOOK_URL is not set — logged only.`);
    return;
  }

  try {
    // Validate before dispatch so a malformed env value degrades to
    // "logged only" instead of throwing an unhandled TypeError.
    new URL(webhookUrl);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...data, submittedAt }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[lead:${kind}] webhook responded ${res.status}`);
    }
  } catch (error) {
    console.error(`[lead:${kind}] webhook delivery failed`, error);
  }
}
