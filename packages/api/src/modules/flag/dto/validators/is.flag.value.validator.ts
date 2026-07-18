import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * `FlagValue` is `boolean | string | number` — a shape class-validator has no
 * built-in decorator for. Whether it actually matches the flag's declared
 * `type` is a domain invariant (`FeatureFlag.isValueOfType`), checked in the
 * use-case; this only guards against non-primitive junk (objects, arrays, null).
 */
export function IsFlagValue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFlagValue',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'boolean' ||
            typeof value === 'string' ||
            typeof value === 'number'
          );
        },
        defaultMessage(): string {
          return `${propertyName} must be a boolean, string, or number`;
        },
      },
    });
  };
}
