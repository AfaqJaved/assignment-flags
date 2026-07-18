import type { ErrorShape } from './error.shape';

/** DB, network, or disk failure. Preserve `cause` for logging, never expose it upstream. @example { kind: 'infrastructure', message: 'DB connection refused', timestamp, cause } */
export type InfrastructureError = ErrorShape & { kind: 'infrastructure'; cause: unknown };

/** Lookup returned nothing. Never use for auth failures — use `UnauthorizedError` to avoid leaking resource existence. @example { kind: 'not_found', message: 'User not found', timestamp, resource: 'User', id: 'f47ac10b-...' } */
export type NotFoundError = ErrorShape & { kind: 'not_found'; resource: string; id: string };

/** Valid input collides with existing state — duplicate unique field or optimistic-lock mismatch. @example { kind: 'conflict', message: 'Email already taken', timestamp, resource: 'User', field: 'email' } */
export type ConflictError = ErrorShape & { kind: 'conflict'; resource: string; field: string };

/** Domain invariant violated inside an entity method — not for raw input shape errors, those belong in the schema layer. @example { kind: 'validation', message: 'User is already suspended', timestamp } */
export type ValidationError = ErrorShape & { kind: 'validation' };

/** Actor lacks permission for the operation. Prefer over `NotFoundError` when hiding resource existence is a security requirement. @example { kind: 'unauthorized', message: 'Only superAdmin can assign roles', timestamp } */
export type UnauthorizedError = ErrorShape & { kind: 'unauthorized' };

/**
 * Full vocabulary of domain errors. Each layer narrows to only what it can produce:
 * - repository    → InfrastructureError | NotFoundError | ConflictError
 * - entity method → ValidationError
 * - domain service → UnauthorizedError | ConflictError
 *
 * Always returned as values via `Result<T, E>`, never thrown.
 */
export type DomainError =
  InfrastructureError | NotFoundError | ConflictError | ValidationError | UnauthorizedError;
