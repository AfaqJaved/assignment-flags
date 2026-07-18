// ── Enums ─────────────────────────────────────────────────────────────────────

/** The kind of value a flag serves. Determines how `defaultValue` is interpreted. */
export type FlagType = 'boolean' | 'string' | 'number';

export type FlagStatus = 'active' | 'archived';

/** The evaluated/default value of a flag — always matches its declared `FlagType`. */
export type FlagValue = boolean | string | number;
