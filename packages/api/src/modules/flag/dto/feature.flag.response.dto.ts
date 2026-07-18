import { ApiProperty } from '@nestjs/swagger';
import type {
  Environment,
  FlagStatus,
  FlagType,
  FlagValue,
} from '@flags/domain';

export class FlagEnvironmentConfigResponseDto {
  @ApiProperty({ example: false })
  enabled: boolean;

  @ApiProperty({ example: 0, minimum: 0, maximum: 100 })
  rolloutPercentage: number;
}

export class FeatureFlagResponseDto {
  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  id: string;

  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  tenantId: string;

  @ApiProperty({ example: 'new-checkout' })
  key: string;

  @ApiProperty({ example: 'New checkout' })
  name: string;

  @ApiProperty({
    example: 'Rolls out the redesigned checkout funnel.',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ enum: ['boolean', 'string', 'number'], example: 'boolean' })
  type: FlagType;

  @ApiProperty({ example: false })
  defaultValue: FlagValue;

  @ApiProperty({ enum: ['active', 'archived'], example: 'active' })
  status: FlagStatus;

  @ApiProperty({
    type: Object,
    description: 'Per-environment rollout config, keyed by environment name.',
    example: {
      development: { enabled: false, rolloutPercentage: 0 },
      staging: { enabled: false, rolloutPercentage: 0 },
      production: { enabled: false, rolloutPercentage: 0 },
    },
  })
  environments: Record<Environment, FlagEnvironmentConfigResponseDto>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ example: 'user_42' })
  createdBy: string;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 'user_42' })
  updatedBy: string;
}
