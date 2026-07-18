import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Required string with configurable min/max length. */
export const PikSlotsStringValidation = (min: number, max: number) =>
  applyDecorators(IsString(), MinLength(min), MaxLength(max));

/** Optional string with a max length. */
export const PikSlotsOptionalStringValidation = (max: number) =>
  applyDecorators(IsOptional(), IsString(), MaxLength(max));

/** Physical address: required string, 5–255 chars. */
export const PikSlotsAddressValidation = () =>
  applyDecorators(IsString(), MinLength(5), MaxLength(255));

/** ISO 4217 currency code (e.g. "USD"): optional 3-char string. */
export const PikSlotsOptionalISOCurrencyValidation = () =>
  applyDecorators(IsOptional(), IsString(), MinLength(3), MaxLength(3));

/** BCP 47 language tag (e.g. "en"): optional string up to 10 chars. */
export const PikSlotsOptionalLanguageValidation = () =>
  applyDecorators(IsOptional(), IsString(), MaxLength(10));
