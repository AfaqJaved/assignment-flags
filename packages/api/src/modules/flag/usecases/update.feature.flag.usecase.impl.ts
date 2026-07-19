import { Inject, Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

import {
  AuditLogEntry,
  err,
  FeatureFlag,
  FlagArchivedError,
  FlagNotFoundError,
  IAuditLogRepository,
  InfrastructureError,
  InvalidFlagValueError,
  InvalidRolloutPercentageError,
  IFeatureFlagRepository,
  ok,
  Result,
  UpdateFeatureFlagInput,
  UpdateFeatureFlagUseCase,
} from '@flags/domain';
import type {
  AuditFieldChange,
  AuditLogRepository,
  FeatureFlagRepository,
  UnauthorizedError,
} from '@flags/domain';
import { SecurityContext } from '../../../shared/security/context/security.context';
import { FlagEvaluationCacheService } from '../../../shared/cache/flag-evaluation/flag.evaluation.cache.service';

@Injectable()
export class UpdateFeatureFlagUseCaseImpl implements UpdateFeatureFlagUseCase {
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    @Inject(IAuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository,
    private readonly securityContext: SecurityContext,
    private readonly evaluationCache: FlagEvaluationCacheService,
  ) {}

  async execute(
    input: UpdateFeatureFlagInput,
  ): Promise<
    Result<
      FeatureFlag,
      | FlagNotFoundError
      | UnauthorizedError
      | FlagArchivedError
      | InvalidRolloutPercentageError
      | InvalidFlagValueError
      | InfrastructureError
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

    let flag = found.value;

    // archived flags are frozen — callers must be explicit and there's no "unarchive" path
    if (flag.isArchived()) {
      return err<FlagArchivedError>({
        kind: 'flag_archived',
        message: 'This flag has been archived and can no longer be mutated',
        timestamp: new Date(),
      });
    }

    // every field below is optional (`undefined` = "don't touch this"), so each check
    // and mutation is individually gated — a request can patch just one field or several

    if (
      input.rolloutPercentage !== undefined &&
      !FeatureFlag.isValidRolloutPercentage(input.rolloutPercentage)
    )
      return err<InvalidRolloutPercentageError>({
        kind: 'invalid_rollout_percentage',
        message: 'Rollout percentage must be between 0 and 100',
        timestamp: new Date(),
        value: input.rolloutPercentage,
      });

    // defaultValue is the one field not scoped to `input.environment` — it applies tenant-wide
    if (
      input.defaultValue !== undefined &&
      !FeatureFlag.isValueOfType(flag.type, input.defaultValue)
    ) {
      return err<InvalidFlagValueError>({
        kind: 'invalid_flag_value',
        message: `Expected a ${flag.type} value`,
        timestamp: new Date(),
        expectedType: flag.type,
      });
    }

    // snapshot pre-mutation state so the audit entry can record real previous values
    const before = flag;

    // all validation passed — now actually apply the patches, chaining through the
    // entity's immutable mutators so each step re-stamps updatedAt/updatedBy
    if (input.enabled !== undefined) {
      flag = flag.toggle(input.environment, input.enabled, input.updatedBy);
    }
    if (input.rolloutPercentage !== undefined) {
      flag = flag.updateRolloutPercentage(
        input.environment,
        input.rolloutPercentage,
        input.updatedBy,
      );
    }

    if (input.defaultValue !== undefined) {
      flag = flag.updateDefaultValue(input.defaultValue, input.updatedBy);
    }

    const saved = await this.flagRepository.save(flag);

    if (!saved.ok)
      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save updated flag',
        timestamp: new Date(),
        cause: saved.error,
      });

    // the flag's config just changed — every cached evaluation for it, across
    // every user, is now stale
    await this.evaluationCache.invalidate(
      saved.value.tenantId,
      saved.value.key,
    );

    // field-level diff — only the fields actually present on the input, compared
    // against the pre-mutation snapshot
    const changes: AuditFieldChange[] = [];
    if (input.enabled !== undefined) {
      changes.push({
        field: 'enabled',
        previousValue: before.getEnvironmentConfig(input.environment).enabled,
        newValue: input.enabled,
      });
    }
    if (input.rolloutPercentage !== undefined) {
      changes.push({
        field: 'rolloutPercentage',
        previousValue: before.getEnvironmentConfig(input.environment)
          .rolloutPercentage,
        newValue: input.rolloutPercentage,
      });
    }
    if (input.defaultValue !== undefined) {
      changes.push({
        field: 'defaultValue',
        previousValue: before.defaultValue,
        newValue: input.defaultValue,
      });
    }

    // a bare enable/disable flip is the common case and gets its own action so
    // history reads distinguish it from broader config changes
    const isToggleOnly =
      input.enabled !== undefined &&
      input.rolloutPercentage === undefined &&
      input.defaultValue === undefined;

    const audited = await this.auditLogRepository.append(
      AuditLogEntry.create({
        id: uuidv7(),
        tenantId: saved.value.tenantId,
        flagId: saved.value.id,
        flagKey: saved.value.key,
        // null when the only change is defaultValue, which applies tenant-wide, not per-environment
        environment:
          input.enabled !== undefined || input.rolloutPercentage !== undefined
            ? input.environment
            : null,
        action: isToggleOnly ? 'flag_toggled' : 'flag_updated',
        changes,
        actorId: input.updatedBy,
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
