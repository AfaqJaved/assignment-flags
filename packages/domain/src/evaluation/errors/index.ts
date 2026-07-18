import type { ErrorShape } from '../../shared';

/** One or more requested flag keys don't exist for this tenant. @example { kind: 'flags_not_found', message: 'Unknown flag keys', timestamp, keys: ['missing-flag'] } */
export type FlagsNotFoundError = ErrorShape & {
  kind: 'flags_not_found';
  keys: string[];
};
