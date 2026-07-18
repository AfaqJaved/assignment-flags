/** Strings longer than this are never shown, even partially — see `maskString`. */
export const REDACT_THRESHOLD = 15;

/** How many leading characters of a short string are shown before the mask. */
const VISIBLE_PREFIX_LENGTH = 6;

/**
 * Masks a single string for logging:
 * - longer than `REDACT_THRESHOLD` chars → fully redacted, e.g. `[Redacted 68 chars long]`
 *   (long strings in this app are things like API keys/hashes — not even a
 *   prefix is safe to show)
 * - `VISIBLE_PREFIX_LENGTH` chars or fewer → fully masked, e.g. `**`
 *   (a prefix of a string that short would just be the whole string)
 * - otherwise → first few characters shown, the rest masked, e.g. `new-ch******`
 */
export function maskString(value: string): string {
  if (value.length > REDACT_THRESHOLD) {
    return `[Redacted ${value.length} chars long]`;
  }

  if (value.length <= VISIBLE_PREFIX_LENGTH) {
    return '*'.repeat(value.length);
  }

  const visible = value.slice(0, VISIBLE_PREFIX_LENGTH);
  const masked = '*'.repeat(value.length - VISIBLE_PREFIX_LENGTH);
  return `${visible}${masked}`;
}

/** Recursively applies `maskString` to every string value in an object/array, leaving structure and non-string values untouched. */
export function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return maskString(value);

  // Object.entries(date) yields nothing (Date has no enumerable own
  // properties), which would otherwise silently collapse to `{}`
  if (value instanceof Date) return maskString(value.toISOString());

  if (Array.isArray(value)) return value.map(redactDeep);

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        redactDeep(val),
      ]),
    );
  }

  return value;
}
