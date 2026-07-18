import { ApiProperty } from '@nestjs/swagger';

/** Never includes `apiKeyHash` — that value must never leave the server. */
export class TenantResponseDto {
  @ApiProperty({ example: 'e8c9c8a0-1e9b-4b8b-8f8b-6c9c8a0e8c9c' })
  id: string;

  @ApiProperty({ example: 'Acme Inc' })
  name: string;

  @ApiProperty({ example: 'acme-inc' })
  slug: string;

  @ApiProperty({ enum: ['active', 'suspended'], example: 'active' })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RegisterTenantResponseDto {
  @ApiProperty({ type: TenantResponseDto })
  tenant: TenantResponseDto;

  @ApiProperty({
    example: 'sk_1f9c2e1a7b6d4c3f...',
    description:
      'Plaintext API key — shown only once, at registration time. Only its hash is stored; ' +
      'it cannot be retrieved again, only rotated.',
  })
  apiKey: string;
}
