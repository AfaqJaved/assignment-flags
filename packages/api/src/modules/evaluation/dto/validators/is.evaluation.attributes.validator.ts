import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * `EvaluationContext.attributes` is a free-form `Record<string, string | number | boolean>`
 * — class-validator has no built-in decorator for that shape. Guards against
 * non-primitive values (nested objects, arrays, null) reaching the domain layer.
 */
export function IsEvaluationAttributes(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEvaluationAttributes',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          )
            return false;

          return Object.values(value as Record<string, unknown>).every(
            (attribute) =>
              typeof attribute === 'string' ||
              typeof attribute === 'number' ||
              typeof attribute === 'boolean',
          );
        },
        defaultMessage(): string {
          return `${propertyName} must be an object whose values are strings, numbers, or booleans`;
        },
      },
    });
  };
}
