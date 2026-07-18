import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * URL-friendly slug: 3–60 lowercase alphanumeric words separated by hyphens.
 * Valid examples: "joes-barbershop", "my-business", "abc123"
 */
export const PikSlotsSlugValidation = () =>
  applyDecorators(
    IsString(),
    MinLength(3),
    MaxLength(60),
    Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'slug must be lowercase alphanumeric words separated by hyphens',
    }),
  );
