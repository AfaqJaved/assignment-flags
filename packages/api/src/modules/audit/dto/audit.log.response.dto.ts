import { ApiProperty } from '@nestjs/swagger';
import type { AuditAction, Environment } from '@flags/domain';

export class AuditFieldChangeResponseDto {
  @ApiProperty({ example: 'rolloutPercentage' })
  field: string;

  @ApiProperty({
    example: 0,
    description: 'Value before the change. Shape varies by field.',
  })
  previousValue: unknown;

  @ApiProperty({
    example: 25,
    description: 'Value after the change. Shape varies by field.',
  })
  newValue: unknown;
}

export class AuditLogEntryResponseDto {
  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  id: string;

  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  tenantId: string;

  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  flagId: string;

  @ApiProperty({ example: 'new-checkout' })
  flagKey: string;

  @ApiProperty({
    enum: ['development', 'staging', 'production'],
    example: 'production',
    nullable: true,
    description:
      'Null for changes that are not environment-scoped (e.g. defaultValue).',
  })
  environment: Environment | null;

  @ApiProperty({
    enum: ['flag_created', 'flag_updated', 'flag_toggled', 'flag_archived'],
    example: 'flag_toggled',
  })
  action: AuditAction;

  @ApiProperty({ type: [AuditFieldChangeResponseDto] })
  changes: AuditFieldChangeResponseDto[];

  @ApiProperty({
    example: 'user_42',
    description:
      'Caller-supplied actor identifier — there is no separate users table.',
  })
  actorId: string;

  @ApiProperty()
  createdAt: Date;
}
