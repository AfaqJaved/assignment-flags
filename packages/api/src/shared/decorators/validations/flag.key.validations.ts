import { applyDecorators } from '@nestjs/common';
import { Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Machine-readable flag key: 1–100 lowercase alphanumeric words separated by
 * hyphens (e.g. "new-checkout"). Max length matches the `key` column
 * (`varchar(100)`).
 */
export const PikSlotsFlagKeyValidation = () =>
  applyDecorators(
    MinLength(1),
    MaxLength(100),
    Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'key must be lowercase alphanumeric words separated by hyphens',
    }),
  );
