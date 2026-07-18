import { HttpStatus } from '@nestjs/common';
import type {
  InfrastructureError,
  TenantAlreadyExistsError,
} from '@flags/domain';
import { FlagsBaseErrorResponse } from '../../../shared/types/base.error.response';

type TenantError = TenantAlreadyExistsError | InfrastructureError;

const tenantErrorMap: Record<
  TenantError['kind'],
  (error: TenantError) => FlagsBaseErrorResponse
> = {
  tenant_already_exists: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.CONFLICT),
  infrastructure: () =>
    new FlagsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapTenantError(error: TenantError): FlagsBaseErrorResponse {
  return tenantErrorMap[error.kind](error);
}
