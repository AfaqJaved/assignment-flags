import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RegisterTenantDto } from '../dto/register.tenant.dto';
import { RegisterTenantResponseDto } from '../dto/tenant.response.dto';

export const RegisterTenantDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new tenant',
      description:
        'Creates a new tenant (application) and returns a plaintext API key. ' +
        'The key is only ever shown once, in this response — only its hash is ' +
        'persisted, so store it now. This is the only endpoint that does not ' +
        'require an `X-API-Key` header.',
    }),
    ApiBody({ type: RegisterTenantDto }),
    ApiCreatedResponse({
      description: 'Tenant registered successfully.',
      type: RegisterTenantResponseDto,
    }),
    ApiConflictResponse({
      description: 'A tenant with this slug already exists.',
    }),
  );
