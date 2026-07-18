import { Inject, Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import {
  ArchiveFeatureFlagInput,
  ArchiveFeatureFlagUseCase,
  AuditLogEntry,
  err,
  FeatureFlag,
  FlagNotFoundError,
  IAuditLogRepository,
  InfrastructureError,
  IFeatureFlagRepository,
  ok,
  Result,
} from '@flags/domain';
import type {
  AuditLogRepository,
  FeatureFlagRepository,
  UnauthorizedError,
} from '@flags/domain';
import { SecurityContext } from '../../../shared/security/context/security.context';
import { FlagEvaluationCacheService } from '../../../shared/cache/flag-evaluation/flag.evaluation.cache.service';

@Injectable()
export class ArchiveFeatureFlagUseCaseImpl
  implements ArchiveFeatureFlagUseCase
{
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    @Inject(IAuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository,
    private readonly securityContext: SecurityContext,
    private readonly evaluationCache: FlagEvaluationCacheService,
  ) {}

  async execute(
    input: ArchiveFeatureFlagInput,
  ): Promise<
    Result<
      FeatureFlag,
      UnauthorizedError | FlagNotFoundError | InfrastructureError
    >
  > {
    const found = await this.flagRepository.findByKey(
      this.securityContext.tenantId,
      input.flagKey,
    );

    if (!found.ok) return err(found.error);

    if (!found.value) {
      return err<FlagNotFoundError>({
        kind: 'flag_not_found',
        message: 'Flag not found by key',
        timestamp: new Date(),
        by: 'key',
        value: input.flagKey,
      });
    }

    if (this.securityContext.tenantId !== found.value.tenantId)
      return err<UnauthorizedError>({
        kind: 'unauthorized',
        message: 'Not Allowed',
        timestamp: new Date(),
      });

    // idempotent by design — archiving an already-archived flag just re-saves the same status,
    // no FlagArchivedError here (that guard only applies to mutating update usecase)
    const archived = found.value.archive(input.archivedBy);

    const saved = await this.flagRepository.save(archived);

    if (!saved.ok) {
      // save() can also return ConflictError, but archiving never changes tenantId/key,
      // so that branch is unreachable in practice — folded into infrastructure either way
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to archive flag',
        timestamp: new Date(),
        cause: saved.error,
      });
    }

    // archived flags always evaluate to their default value — every cached
    // evaluation for this flag is now stale
    await this.evaluationCache.invalidate(saved.value.tenantId, saved.value.key);

    const audited = await this.auditLogRepository.append(
      AuditLogEntry.create({
        id: uuidv7(),
        tenantId: saved.value.tenantId,
        flagId: saved.value.id,
        flagKey: saved.value.key,
        environment: null,
        action: 'flag_archived',
        changes: [
          {
            field: 'status',
            previousValue: found.value.status,
            newValue: saved.value.status,
          },
        ],
        actorId: input.archivedBy,
      }),
    );

    if (!audited.ok)
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to record audit log entry',
        timestamp: new Date(),
        cause: audited.error,
      });

    return ok(saved.value);
  }
}
