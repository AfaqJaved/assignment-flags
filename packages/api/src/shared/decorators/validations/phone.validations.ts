import { applyDecorators } from '@nestjs/common';
import { IsOptional, Matches } from 'class-validator';

/**
 * Optional E.164 phone number (e.g. "+12025551234").
 * When present, must start with "+" followed by 2–15 digits.
 */
export const PikSlotsPhoneValidation = () =>
  applyDecorators(
    IsOptional(),
    Matches(/^\+[1-9]\d{1,14}$/, {
      message: 'phone must be a valid E.164 number (e.g. "+12025551234")',
    }),
  );
