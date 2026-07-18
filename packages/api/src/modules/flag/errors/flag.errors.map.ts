import { HttpStatus } from '@nestjs/common';
import type {
  FlagAlreadyExistsError,
  FlagArchivedError,
  FlagNotFoundError,
  InfrastructureError,
  InvalidFlagValueError,
  InvalidRolloutPercentageError,
  UnauthorizedError,
} from '@flags/domain';
import { FlagsBaseErrorResponse } from '../../../shared/types/base.error.response';

type FlagError =
  | FlagAlreadyExistsError
  | UnauthorizedError
  | InvalidFlagValueError
  | FlagNotFoundError
  | FlagArchivedError
  | InvalidRolloutPercentageError
  | InfrastructureError;

const flagErrorMap: Record<
  FlagError['kind'],
  (error: FlagError) => FlagsBaseErrorResponse
> = {
  flag_already_exists: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.CONFLICT),
  invalid_flag_value: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.BAD_REQUEST),
  flag_not_found: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.NOT_FOUND),
  unauthorized: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.UNAUTHORIZED),
  flag_archived: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.CONFLICT),
  invalid_rollout_percentage: (error) =>
    new FlagsBaseErrorResponse(error.message, HttpStatus.BAD_REQUEST),
  infrastructure: () =>
    new FlagsBaseErrorResponse(
      'Something went wrong. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
};

export function mapFlagError(error: FlagError): FlagsBaseErrorResponse {
  return flagErrorMap[error.kind](error);
}
