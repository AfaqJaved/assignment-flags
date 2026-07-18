import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PikSlotsSlugValidation } from '../../../shared/decorators/validations';

export class RegisterTenantDto {
  @ApiProperty({
    example: 'Acme Inc',
    description: 'Display name of the tenant application',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'acme-inc',
    description:
      'URL-friendly unique identifier for the tenant. Lowercase alphanumeric words separated by hyphens.',
  })
  @PikSlotsSlugValidation()
  slug: string;
}
