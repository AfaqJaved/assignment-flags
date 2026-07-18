import { applyDecorators } from '@nestjs/common';
import { IsEmail, MaxLength } from 'class-validator';

/** Contact email: valid email address, max 100 chars. */
export const PikSlotsEmailValidation = () =>
  applyDecorators(IsEmail(), MaxLength(100));
