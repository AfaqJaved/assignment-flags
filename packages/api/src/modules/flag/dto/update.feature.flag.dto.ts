import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { Environment, FlagValue } from '@flags/domain';
import { ENVIRONMENTS } from '@flags/domain';
import {
  PikSlotsEnumValidation,
  PikSlotsStringValidation,
} from '../../../shared/decorators/validations';
import { IsFlagValue } from './validators/is.flag.value.validator';

export class UpdateFeatureFlagParamsDto {
  @ApiProperty({ example: 'new-checkout' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ enum: ENVIRONMENTS, example: 'production' })
  @PikSlotsEnumValidation(ENVIRONMENTS)
  environment: Environment;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 25, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Updates the flag's default value across every environment.",
  })
  @IsOptional()
  @IsFlagValue()
  defaultValue?: FlagValue;

  @ApiProperty({ example: 'user_42' })
  @PikSlotsStringValidation(1, 255)
  updatedBy: string;
}
