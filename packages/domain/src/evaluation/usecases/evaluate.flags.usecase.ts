import type { InfrastructureError, Result } from '../../shared';
import type { TenantNotFoundError, EnvironmentNotSupportedError } from '../../tenant/errors';
import type { Environment } from '../../tenant/types';
import type { FlagsNotFoundError } from '../errors';
import type { EvaluationContext } from '../types';
import type { EvaluatedFlag } from '../value-objects';

export const IEvaluateFlagsUseCase = Symbol('IEvaluateFlagsUseCase');

/** Evaluates a specific set of flags (or all active flags, if `flagKeys` is omitted) for a user/context. */
export interface EvaluateFlagsInput {
  tenantId: string;
  environment: Environment;
  flagKeys?: string[];
  context: EvaluationContext;
}

export interface EvaluateFlagsUseCase {
  execute(
    input: EvaluateFlagsInput,
  ): Promise<
    Result<
      EvaluatedFlag[],
      TenantNotFoundError | EnvironmentNotSupportedError | FlagsNotFoundError | InfrastructureError
    >
  >;
}
