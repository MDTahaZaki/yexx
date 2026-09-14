// Domains of disposable/temporary email services — accounts made with
// these can't receive the pre-order confirmation or respond to a "we're
// shipping" email, so registration blocks them outright.
//
// To extend: add more lowercase domains (no "@", no subdomain wildcards —
// list each host explicitly) to this array. Matching is exact-host,
// case-insensitive (see isDisposableEmailDomain below).
export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "10minutemail.com",
  "10minutemail.net",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "sharklasers.com",
  "mailcatch.com",
  "mintemail.com",
  "mailnesia.com",
  "spamgourmet.com",
  "moakt.com",
  "emailondeck.com",
  "burnermail.io",
  "mytemp.email",
  "tempinbox.com",
  "discard.email",
  "mohmal.com",
  "inboxbear.com",
  "tempail.com",
  "mailtemp.info",
] as const;

const DISPOSABLE_EMAIL_DOMAINS_SET = new Set<string>(DISPOSABLE_EMAIL_DOMAINS);

export function isDisposableEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain ? DISPOSABLE_EMAIL_DOMAINS_SET.has(domain) : false;
}
