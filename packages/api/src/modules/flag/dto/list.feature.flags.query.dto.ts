import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import type { Environment, FlagStatus } from '@flags/domain';
import { ENVIRONMENTS } from '@flags/domain';
import { PikSlotsEnumValidation } from '../../../shared/decorators/validations';

export const FLAG_STATUSES = ['active', 'archived'] as const;

export class ListFeatureFlagsQueryDto {
  @ApiPropertyOptional({
    enum: ENVIRONMENTS,
    description: 'Only return flags enabled in this environment.',
  })
  @IsOptional()
  @PikSlotsEnumValidation(ENVIRONMENTS)
  environment?: Environment;

  @ApiPropertyOptional({ enum: FLAG_STATUSES })
  @IsOptional()
  @PikSlotsEnumValidation(FLAG_STATUSES)
  status?: FlagStatus;
}
