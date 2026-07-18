import { ApiProperty } from '@nestjs/swagger';
import { PikSlotsStringValidation } from '../../../shared/decorators/validations';

export class ArchiveFeatureFlagDto {
  @ApiProperty({
    example: 'user_42',
    description:
      'Caller-supplied actor identifier — there is no separate users table.',
  })
  @PikSlotsStringValidation(1, 255)
  archivedBy: string;
}
