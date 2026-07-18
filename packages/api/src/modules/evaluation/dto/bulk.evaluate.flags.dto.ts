import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import type { Environment } from '@flags/domain';
import { ENVIRONMENTS } from '@flags/domain';
import {
  PikSlotsEnumValidation,
  PikSlotsStringValidation,
} from '../../../shared/decorators/validations';
import { IsEvaluationAttributes } from './validators/is.evaluation.attributes.validator';

export class BulkEvaluateFlagsDto {
  @ApiProperty({ enum: ENVIRONMENTS, example: 'production' })
  @PikSlotsEnumValidation(ENVIRONMENTS)
  environment: Environment;

  @ApiProperty({
    example: 'user_42',
    description: 'Identifies the caller for rollout bucketing and targeting.',
  })
  @PikSlotsStringValidation(1, 255)
  userId: string;

  @ApiPropertyOptional({
    type: Object,
    description:
      'Arbitrary targeting attributes for this user. Values must be strings, numbers, or booleans.',
    example: { plan: 'enterprise', betaTester: true },
  })
  @IsOptional()
  @IsEvaluationAttributes()
  context?: Record<string, string | number | boolean>;
}
