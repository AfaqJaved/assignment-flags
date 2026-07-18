import { HttpStatus } from '@nestjs/common';
import type {
  EnvironmentNotSupportedError,
  FlagsNotFoundError,
  InfrastructureError,
  TenantNotFoundError,
} from '@flags/domain';
import { FlagsBaseErrorResponse } from '../../../shared/types/base.error.response';

type EvaluationError =
  | TenantNotFoundError
  | EnvironmentNotSupportedError
  | FlagsNotFoundError
  | InfrastructureError;

const evaluationErrorMap: Record<
  EvaluationError['kind'],
  (error: EvaluationError) => FlagsBaseErrorResponse
> = {
  tenant_not_found: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  environment_not_supported: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.BAD_REQUEST),
  flags_not_found: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  infrastructure: () =>
    new FlagsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapEvaluationError(
  error: EvaluationError,
): FlagsBaseErrorResponse {
  return evaluationErrorMap[error.kind](error);
}
