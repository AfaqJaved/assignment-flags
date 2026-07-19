import { Inject, Injectable } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import {
  AuditLogEntry,
  CreateFeatureFlagInput,
  CreateFeatureFlagUseCase,
  err,
  FeatureFlag,
  FlagAlreadyExistsError,
  IAuditLogRepository,
  InfrastructureError,
  InvalidFlagValueError,
  IFeatureFlagRepository,
  ok,
  Result,
} from '@flags/domain';
import type {
  AuditLogRepository,
  FeatureFlagRepository,
  UnauthorizedError,
} from '@flags/domain';

@Injectable()
export class CreateFeatureFlagUseCaseImpl implements CreateFeatureFlagUseCase {
  constructor(
    @Inject(IFeatureFlagRepository)
    private readonly flagRepository: FeatureFlagRepository,
    @Inject(IAuditLogRepository)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(
    input: CreateFeatureFlagInput,
  ): Promise<
    Result<
      FeatureFlag,
      | UnauthorizedError
      | FlagAlreadyExistsError
      | InvalidFlagValueError
      | InfrastructureError
    >
  > {
    // defaultValue's runtime type must match the declared type before anything is persisted
    if (!FeatureFlag.isValueOfType(input.type, input.defaultValue)) {
      return err<InvalidFlagValueError>({
        kind: 'invalid_flag_value',
        message: `Expected a ${input.type} value`,
        timestamp: new Date(),
        expectedType: input.type,
      });
    }

    // pre-check for a friendlier error than waiting on the DB's unique constraint
    const existing = await this.flagRepository.findByKey(
      input.tenantId,
      input.key,
    );
    if (!existing.ok) return err(existing.error);

    if (existing.value) {
      return err<FlagAlreadyExistsError>({
        kind: 'flag_already_exists',
        message: 'A flag with this key already exists',
        timestamp: new Date(),
        key: input.key,
      });
    }

    // starts disabled, 0% rollout, in every environment (see FeatureFlag.create)
    const flag = FeatureFlag.create(input);

    const saved = await this.flagRepository.save(flag);

    if (!saved.ok) {
      // race with a concurrent create on the same key — caught by the DB, not the pre-check above
      if (saved.error.kind === 'conflict') {
        return err<FlagAlreadyExistsError>({
          kind: 'flag_already_exists',
          message: 'A flag with this key already exists',
          timestamp: new Date(),
          key: input.key,
        });
      }
      return err(saved.error);
    }

    // audit trail is best-effort infrastructure, same error union as the save above —
    // a failed write here surfaces as InfrastructureError rather than silently dropping history
    const audited = await this.auditLogRepository.append(
      AuditLogEntry.create({
        id: uuidv7(),
        tenantId: saved.value.tenantId,
        flagId: saved.value.id,
        flagKey: saved.value.key,
        environment: null,
        action: 'flag_created',
        changes: [],
        actorId: saved.value.createdBy,
      }),
    );
    if (!audited.ok) return err(audited.error);

    return ok(saved.value);
  }
}
