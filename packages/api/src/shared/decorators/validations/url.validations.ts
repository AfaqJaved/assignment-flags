import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsUrl } from 'class-validator';

/** Required URL. */
export const PikSlotsUrlValidation = () => applyDecorators(IsUrl());

/** Optional URL. */
export const PikSlotsOptionalUrlValidation = () =>
  applyDecorators(IsOptional(), IsUrl());
