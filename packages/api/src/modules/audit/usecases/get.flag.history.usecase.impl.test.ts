import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditLogEntry,
  IAuditLogRepository,
  IFeatureFlagRepository,
  ok,
} from '@flags/domain';
import { AuditLogRepositoryTestImpl } from '../repository/audit.log.repository.fake.impl';
import { AUDIT_LOG_TEST_DATA } from '../repository/audit.log.test.data';
import { FeatureFlagRepositoryTestImpl } from '../../flag/repository/feature.flag.repository.fake.impl';
import { FEATURE_FLAG_TEST_DATA } from '../../flag/repository/feature.flag.test.data';
import { SecurityContext } from '../../../shared/security/context/security.context';
import { GetFlagHistoryUseCaseImpl } from './get.flag.history.usecase.impl';

/**
 * `findByKey` normally scopes its query by tenant, so a flag belonging to
 * another tenant can never actually be returned here — this stub ignores
 * that scope on purpose, to exercise the use case's own tenantId-vs-record
 * guard, which only matters if the repository itself ever stops scoping
 * correctly.
 */
class CrossTenantLeakFeatureFlagRepositoryStub extends FeatureFlagRepositoryTestImpl {
  async findByKey(_tenantId: string, key: string) {
    return ok(
      FEATURE_FLAG_TEST_DATA.find((flag) => flag.key === key) ?? null,
    );
  }
}

describe('GetFlagHistoryUseCaseImpl', () => {
  const createUseCase = async (): Promise<GetFlagHistoryUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GetFlagHistoryUseCaseImpl,
        { provide: IAuditLogRepository, useClass: AuditLogRepositoryTestImpl },
        {
          provide: IFeatureFlagRepository,
          useClass: FeatureFlagRepositoryTestImpl,
        },
        {
          provide: SecurityContext,
          useValue: { tenantId: 'tenant-acme-1' },
        },
      ],
    }).compile();

    return moduleRef.get(GetFlagHistoryUseCaseImpl);
  };

  it('returns the history for an existing flag, most recent first', async () => {
    const useCase = await createUseCase();

    AUDIT_LOG_TEST_DATA.push(
      AuditLogEntry.create({
        id: 'audit-2',
        tenantId: 'tenant-acme-1',
        flagId: 'flag-new-checkout-1',
        flagKey: 'new-checkout',
        environment: 'staging',
        action: 'flag_toggled',
        changes: [{ field: 'enabled', previousValue: false, newValue: true }],
        actorId: 'user-2',
      }),
    );

    const result = await useCase.execute({ flagKey: 'new-checkout' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);
      expect(
        result.value.some((entry) => entry.action === 'flag_created'),
      ).toBe(true);
      expect(
        result.value.some((entry) => entry.action === 'flag_toggled'),
      ).toBe(true);
    }
  });

  it('returns not_found for an unknown flag key', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({ flagKey: 'does-not-exist' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('flag_not_found');
    }
  });

  it("returns unauthorized when the found flag's tenantId does not match the security context", async () => {
    // 'new-checkout' belongs to tenant-acme-1 in FEATURE_FLAG_TEST_DATA, but this
    // security context claims to be a different tenant — the repository stub
    // ignores the tenant scope so the use case's own guard is what has to catch it
    const moduleRef = await Test.createTestingModule({
      providers: [
        GetFlagHistoryUseCaseImpl,
        { provide: IAuditLogRepository, useClass: AuditLogRepositoryTestImpl },
        {
          provide: IFeatureFlagRepository,
          useClass: CrossTenantLeakFeatureFlagRepositoryStub,
        },
        {
          provide: SecurityContext,
          useValue: { tenantId: 'tenant-other' },
        },
      ],
    }).compile();
    const useCase = moduleRef.get(GetFlagHistoryUseCaseImpl);

    const result = await useCase.execute({ flagKey: 'new-checkout' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('unauthorized');
    }
  });
});
