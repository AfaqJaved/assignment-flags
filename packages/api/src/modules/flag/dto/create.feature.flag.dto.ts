import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FlagType, FlagValue } from '@flags/domain';
import {
  PikSlotsEnumValidation,
  PikSlotsFlagKeyValidation,
  PikSlotsOptionalStringValidation,
  PikSlotsStringValidation,
} from '../../../shared/decorators/validations';
import { IsFlagValue } from './validators/is.flag.value.validator';

export const FLAG_TYPES = ['boolean', 'string', 'number'] as const;

export class CreateFeatureFlagDto {
  @ApiProperty({
    example: 'new-checkout',
    description: 'Machine-readable identifier, unique within the tenant.',
  })
  @PikSlotsFlagKeyValidation()
  key: string;

  @ApiProperty({ example: 'New checkout' })
  @PikSlotsStringValidation(1, 200)
  name: string;

  @ApiPropertyOptional({ example: 'Rolls out the redesigned checkout funnel.' })
  @PikSlotsOptionalStringValidation(1000)
  description?: string;

  @ApiProperty({ enum: FLAG_TYPES, example: 'boolean' })
  @PikSlotsEnumValidation(FLAG_TYPES)
  type: FlagType;

  @ApiProperty({
    example: false,
    description:
      "The flag's fallback value. Its runtime type must match `type`.",
  })
  @IsFlagValue()
  defaultValue: FlagValue;

  @ApiProperty({
    example: 'user_42',
    description:
      'Caller-supplied actor identifier — there is no separate users table.',
  })
  @PikSlotsStringValidation(1, 255)
  createdBy: string;
}
