import { BadRequestException, type ValidationError } from '@nestjs/common';

/**
 * Recursively walks a tree of `ValidationError` objects and collects every
 * human-readable constraint message into a flat string array.
 *
 * class-validator builds a tree when validating nested objects (e.g. a DTO
 * that contains another DTO via `@ValidateNested`). Top-level errors have
 * their messages in `error.constraints`; errors on nested properties are
 * stored in `error.children`. This function handles both levels so no
 * message is lost regardless of nesting depth.
 *
 * @example
 * // Given errors for `username` and a nested `name.firstName`:
 * flattenErrors(errors)
 * // => ['username must be lowercase alphanumeric', 'firstName must be longer than 1 character']
 */
function flattenErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const constraints = error.constraints
      ? Object.values(error.constraints)
      : [];
    const childErrors = error.children?.length
      ? flattenErrors(error.children)
      : [];
    return [...constraints, ...childErrors];
  });
}

/**
 * Custom `exceptionFactory` for NestJS `ValidationPipe`.
 *
 * By default `ValidationPipe` throws a `BadRequestException` whose body is
 * shaped by NestJS internals and does not match the Pikslots error envelope
 * `{ message, statusCode, timestamp }`. This factory overrides that behaviour
 * so validation failures are indistinguishable in shape from every other API
 * error.
 *
 * All constraint messages across every failing field (including nested DTOs)
 * are joined into a single semicolon-separated string so the client receives
 * the full picture in one response.
 *
 * Usage — pass to `ValidationPipe` in `main.ts`:
 * ```ts
 * app.useGlobalPipes(
 *   new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
 * );
 * ```
 *
 * @example
 * // Response body for a request with an invalid username and phone:
 * {
 *   "message": "username must be lowercase alphanumeric; phone must be a valid E.164 number",
 *   "statusCode": 400,
 *   "timestamp": "2026-05-19T10:00:00.000Z"
 * }
 */
export function validationExceptionFactory(errors: ValidationError[]) {
  const messages = flattenErrors(errors);
  return new BadRequestException({
    message: messages.join('; '),
    statusCode: 400,
    timestamp: new Date().toUTCString(),
  });
}
