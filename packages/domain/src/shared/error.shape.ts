/**
 * Base structure every domain error must satisfy.
 *
 * - `kind`      — machine-readable discriminant for switch/match
 * - `message`   — human-readable description for logs and dev tooling
 * - `timestamp` — when the error was created
 */
export interface ErrorShape {
  readonly kind: string;
  readonly message: string;
  readonly timestamp: Date;
}
