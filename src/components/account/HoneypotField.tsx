/**
 * Classic honeypot: a field named after something a form-filling bot
 * commonly auto-fills ("website"), positioned off-screen rather than
 * `display:none` (some bots specifically skip hidden fields, off-screen
 * positioning is harder for a scraper to distinguish from a real field),
 * and excluded from the accessibility tree and tab order so screen-reader
 * and keyboard users never even know it's there. A human never fills
 * this in; the server silently treats a non-empty value as a bot
 * submission (see the route handlers) rather than surfacing any error —
 * telling a bot it was caught only teaches it to adapt.
 */
export default function HoneypotField() {
  return (
    <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="website">Website</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
