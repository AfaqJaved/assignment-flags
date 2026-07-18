import { applyDecorators } from '@nestjs/common';
import { IsOptional } from 'class-validator';
import { IsTimezone } from '../is.timezone';

/** Required IANA timezone (e.g. "America/New_York"). */
export const PikSlotsTimezoneValidation = () => applyDecorators(IsTimezone());

/** Optional IANA timezone (e.g. "America/New_York"). */
export const PikSlotsOptionalTimezoneValidation = () =>
  applyDecorators(IsOptional(), IsTimezone());
