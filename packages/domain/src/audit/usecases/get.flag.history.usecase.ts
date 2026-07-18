import type { InfrastructureError, Result, UnauthorizedError } from '../../shared';
import type { FlagNotFoundError } from '../../flag/errors';
import type { AuditLogEntry } from '../audit.log.entry.entity';

export const IGetFlagHistoryUseCase = Symbol('IGetFlagHistoryUseCase');

export interface GetFlagHistoryInput {
  flagKey: string;
}

export interface GetFlagHistoryUseCase {
  execute(
    input: GetFlagHistoryInput,
  ): Promise<Result<AuditLogEntry[], UnauthorizedError | FlagNotFoundError | InfrastructureError>>;
}
