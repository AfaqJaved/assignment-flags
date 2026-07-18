import type { InfrastructureError, Result } from '../../shared';
import type { TenantNotFoundError, EnvironmentNotSupportedError } from '../../tenant/errors';
import type { Environment } from '../../tenant/types';
import type { EvaluationContext } from '../types';
import type { EvaluatedFlag } from '../value-objects';

export const IBulkEvaluateFlagsUseCase = Symbol('IBulkEvaluateFlagsUseCase');

/** Evaluates every active flag for a tenant/environment against a single user/context, in one request. */
export interface BulkEvaluateFlagsInput {
  tenantId: string;
  environment: Environment;
  context: EvaluationContext;
}

export interface BulkEvaluateFlagsUseCase {
  execute(
    input: BulkEvaluateFlagsInput,
  ): Promise<
    Result<
      EvaluatedFlag[],
      TenantNotFoundError | EnvironmentNotSupportedError | InfrastructureError
    >
  >;
}
