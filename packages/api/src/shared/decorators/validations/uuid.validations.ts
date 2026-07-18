import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';

/** Optional UUID v7 field. */
export const PikSlotsOptionalUUIDValidation = () =>
  applyDecorators(IsOptional(), IsUUID(7, { message: 'Must be a valid UUID' }));

export const PikSlotsUUIDValidation = () =>
  applyDecorators(IsUUID(7, { message: 'Must be a valid UUID' }));
