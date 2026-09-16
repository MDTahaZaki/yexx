// Server-side cleanup for the app's three free-text fields — pre-order
// notes, the wholesale form's notes field, and review title/body. Applied
// in the route handler before the Zod schema runs, so length limits and
// required-content checks (schema.sql's CHECK constraints on reviews,
// the equivalent Zod maxes for the notes fields, which have no DB
// counterpart) validate the cleaned text rather than the raw submission.

const HTML_TAG_RE = /<[^>]*>/g;
// \t \n \v \f \r are deliberately left out — they're whitespace, and
// normaliseWhitespace collapses them a moment later. This only strips the
// control characters that whitespace collapsing wouldn't touch.
const CONTROL_CHAR_RE = /[\x00-\x08\x0E-\x1F\x7F]/g;
const WHITESPACE_RE = /\s+/g;

export function sanitizeFreeText(input: string): string {
  return input
    .replace(HTML_TAG_RE, "")
    .replace(CONTROL_CHAR_RE, "")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

/**
 * Shallow-clones `body` with `field` sanitized in place, if `body` is a
 * plain object and `field` is a string on it. Anything else (non-object
 * body, missing field, wrong-typed field) passes through untouched, so the
 * schema's own validation still produces its normal error for those cases
 * instead of this silently swallowing them.
 */
export function sanitizeBodyField(body: unknown, field: string): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const record = body as Record<string, unknown>;
  if (typeof record[field] !== "string") return body;
  return { ...record, [field]: sanitizeFreeText(record[field] as string) };
}

// Deliberately simple pattern matching, not a general-purpose URL parser:
// catches http(s):// links, bare "www." links, and bare domains (e.g.
// "example.com/order") without requiring a scheme — enough to block the
// spam pattern a private notes field is exposed to. The `(?<!@)` guard
// keeps an email address a customer legitimately types in a note (e.g.
// "email me at foo@example.com instead") from being flagged as a link.
const URL_RE =
  /(https?:\/\/|www\.)\S+|(?<!@)\b[a-z0-9-]+\.(?:com|net|org|io|co|in|info|biz|xyz|ai|dev|app|link|shop|store|online|site|me|gg|to|ly)\b/i;

export function containsUrl(input: string): boolean {
  return URL_RE.test(input);
}
