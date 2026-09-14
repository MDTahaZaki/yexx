import "server-only";
import { Resend } from "resend";

// Resend's SMTP/API key — set this once you've verified a sending
// domain with Resend (see the setup steps in the chat response this
// file shipped with). Falls back to a placeholder address on the
// project's placeholder domain, which will simply fail to send until
// you update it — see RESEND_FROM_EMAIL below.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "YEXX <preorders@yexx.example>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Best-effort send — logs and returns rather than throwing. A pre-order
 * (or any other action that triggers an email) must always succeed even
 * if Resend is unreachable, misconfigured, or simply not set up yet in
 * local dev; the caller never needs a try/catch around this.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — would have sent "${subject}" to ${to}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) console.error(`[email] Resend rejected "${subject}" to ${to}`, error);
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}`, error);
  }
}

// Shared chrome around every transactional email — warm cream
// background, a gold rule under the wordmark, plain readable body copy.
// Deliberately not a multi-column newsletter layout; inline styles only,
// since most email clients strip <style> blocks.
function emailShell(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f0e6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#f5f0e6;">
            <tr>
              <td style="padding-bottom:24px;border-bottom:1px solid #c6a664;">
                <span style="font-size:14px;letter-spacing:0.3em;font-weight:600;color:#241f17;text-transform:uppercase;">Y&nbsp;E&nbsp;X&nbsp;X</span>
              </td>
            </tr>
            <tr>
              <td style="padding-top:28px;color:#241f17;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;border-top:1px solid rgba(36,31,23,0.12);margin-top:32px;color:rgba(36,31,23,0.5);font-size:12px;">
                YEXX Energy Drink &middot; This is a transactional email about your account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function preorderConfirmationEmail(params: { size: string; quantity: number }): { subject: string; html: string } {
  const subject = "Your YEXX pre-order is registered";
  const html = emailShell(`
    <p style="margin:0 0 16px;">Thanks for registering your interest.</p>
    <p style="margin:0 0 16px;">You're down for <strong>${params.quantity} &times; ${params.size}</strong>.</p>
    <p style="margin:0 0 16px;"><strong>No payment has been taken</strong>, and the shipping date isn't confirmed yet — this simply reserves your spot and tells us how much demand to plan for. We'll email you again once sizes are ready to ship.</p>
    <p style="margin:0;">Changed your mind, or want to adjust the size or quantity? Sign in to your account and visit the Pre-Order page — you can edit or cancel it there any time before it ships.</p>
  `);
  return { subject, html };
}
