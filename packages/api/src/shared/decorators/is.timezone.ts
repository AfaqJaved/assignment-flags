import { registerDecorator, type ValidationOptions } from 'class-validator';

export function IsTimezone(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTimezone',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid IANA timezone (e.g. "America/New_York")`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: value });
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  };
}
