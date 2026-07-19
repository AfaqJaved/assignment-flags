import { ApiProperty } from '@nestjs/swagger';
import type { EvaluationReason } from '@flags/domain';

export class EvaluatedFlagResponseDto {
  @ApiProperty({ example: 'new-checkout' })
  flagKey: string;

  @ApiProperty({
    example: true,
    description: 'The resolved value. Shape varies by flag type.',
  })
  value: unknown;

  @ApiProperty({
    enum: [
      'flag_not_found',
      'flag_disabled',
      'flag_archived',
      'rollout',
      'default',
    ],
    example: 'rollout',
    description: 'Why the flag resolved to this value.',
  })
  reason: EvaluationReason;

  @ApiProperty({
    example: true,
    description: 'Whether this result was served from cache.',
  })
  cacheHit: boolean;
}
