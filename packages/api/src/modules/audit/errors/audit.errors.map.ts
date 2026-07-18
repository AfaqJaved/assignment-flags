import { HttpStatus } from '@nestjs/common';
import type {
  FlagNotFoundError,
  InfrastructureError,
  UnauthorizedError,
} from '@flags/domain';
import { FlagsBaseErrorResponse } from '../../../shared/types/base.error.response';

type AuditError = FlagNotFoundError | UnauthorizedError | InfrastructureError;

const auditErrorMap: Record<
  AuditError['kind'],
  (error: AuditError) => FlagsBaseErrorResponse
> = {
  flag_not_found: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  unauthorized: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  infrastructure: () =>
    new FlagsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapAuditError(error: AuditError): FlagsBaseErrorResponse {
  return auditErrorMap[error.kind](error);
}
