import { applyDecorators } from '@nestjs/common';
import { IsEnum } from 'class-validator';

/** Validates that the value is one of the provided enum values. */
export const PikSlotsEnumValidation = <T extends readonly unknown[]>(
  values: T,
) => applyDecorators(IsEnum(values));
