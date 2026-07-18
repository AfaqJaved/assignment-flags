import type { ErrorShape } from '../../shared';
import type { FlagType } from '../types';

/** No flag was found for the given lookup value. @example { kind: 'flag_not_found', message: 'Flag not found by key', timestamp, by: 'key', value: 'new-checkout' } */
export type FlagNotFoundError = ErrorShape & {
  kind: 'flag_not_found';
  by: 'id' | 'key';
  value: string;
};

/** A flag with the same key already exists for this tenant. @example { kind: 'flag_already_exists', message: 'Flag key already in use', timestamp, key: 'new-checkout' } */
export type FlagAlreadyExistsError = ErrorShape & {
  kind: 'flag_already_exists';
  key: string;
};

/** The flag has been archived (soft-deleted) and can no longer be mutated. */
export type FlagArchivedError = ErrorShape & { kind: 'flag_archived' };

/** The flag has been archived (soft-deleted) and can no longer be mutated. */
export type FlagAlreadyArchivedError = ErrorShape & { kind: 'flag_already_archived' };

/** Rollout percentage must be a number between 0 and 100. @example { kind: 'invalid_rollout_percentage', message: 'Rollout percentage must be between 0 and 100', timestamp, value: 142 } */
export type InvalidRolloutPercentageError = ErrorShape & {
  kind: 'invalid_rollout_percentage';
  value: number;
};

/** The supplied value's runtime type does not match the flag's declared type. @example { kind: 'invalid_flag_value', message: 'Expected a boolean value', timestamp, expectedType: 'boolean' } */
export type InvalidFlagValueError = ErrorShape & {
  kind: 'invalid_flag_value';
  expectedType: FlagType;
};
