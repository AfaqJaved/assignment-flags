import { Inject, Injectable } from '@nestjs/common';
import {
  AuditLogEntry,
  err,
  FlagNotFoundError,
  GetFlagHistoryInput,
  GetFlagHistoryUseCase,
  IAuditLogRepository,
  IFeatureFlagRepository,
  InfrastructureError,
  Result,
} from '@flags/domain';
import type {
  AuditLogRepository,
  FeatureFlagRepository,
  UnauthorizedError,
} from '@flags/domain';
import { SecurityContext } from '../../../shared/security/context/security.context';

@Injectable()
export class GetFlagHistoryUseCaseImpl implements GetFlagHistoryUseCase {
  constructor(
    @Inject(IAuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository,
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    private readonly securityContext: SecurityContext,
  ) {}

  async execute(
    input: GetFlagHistoryInput,
  ): Promise<
    Result<
      AuditLogEntry[],
      UnauthorizedError | FlagNotFoundError | InfrastructureError
    >
  > {
    // history is meaningless for a flag that doesn't exist — surface 404 rather than an empty list
    const flag = await this.flagRepository.findByKey(
      this.securityContext.tenantId,
      input.flagKey,
    );

    if (!flag.ok) return err(flag.error);

    if (!flag.value) {
      return err<FlagNotFoundError>({
        kind: 'flag_not_found',
        message: 'Flag not found by key',
        timestamp: new Date(),
        by: 'key',
        value: input.flagKey,
      });
    }

    // defense-in-depth: findByKey is already scoped by tenant, so this only
    // fires if the repository itself ever stops scoping correctly
    if (this.securityContext.tenantId !== flag.value.tenantId)
      return err<UnauthorizedError>({
        kind: 'unauthorized',
        message: 'Not Allowed',
        timestamp: new Date(),
      });

    return this.auditLogRepository.findByFlag(
      this.securityContext.tenantId,
      input.flagKey,
    );
  }
}
