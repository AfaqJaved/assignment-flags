import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

/** Password: string with a minimum of 8 characters. */
export const PikSlotsPasswordValidation = () =>
  applyDecorators(IsString(), MinLength(8));
