import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Username: 3–30 lowercase alphanumeric chars; underscores/hyphens allowed
 * but not at the start or end.
 * Valid examples: "john_doe", "jane-smith", "user123"
 */
export const PikSlotsUsernameValidation = () =>
  applyDecorators(
    IsString(),
    MinLength(3),
    MaxLength(30),
    Matches(/^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/, {
      message:
        'username must be lowercase alphanumeric; underscores or hyphens allowed but not at start or end',
    }),
  );
