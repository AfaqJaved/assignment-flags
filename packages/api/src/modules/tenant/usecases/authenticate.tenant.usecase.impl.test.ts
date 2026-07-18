import { Test, TestingModule } from '@nestjs/testing';
import { ITenantRepository, TenantRepository } from '@flags/domain';

// Mock uuid to avoid ESM parsing issues
jest.mock('uuid', () => ({
  v7: jest.fn(() => crypto.randomUUID()),
}));

import { TenantRepositoryTestImpl } from '../repository/tenant.repository.fake.impl';
import { ApiKeyHashingService } from '../../../shared/security/hashing/api.key.hashing.service';
import { RegisterTenantUseCaseImpl } from './register.tenant.usecase.impl';
import { AuthenticateTenantUseCaseImpl } from './authenticate.tenant.usecase.impl';

describe('AuthenticateTenantUseCaseImpl', () => {
  const createModule = async (): Promise<TestingModule> =>
    Test.createTestingModule({
      providers: [
        RegisterTenantUseCaseImpl,
        AuthenticateTenantUseCaseImpl,
        { provide: ITenantRepository, useClass: TenantRepositoryTestImpl },
        ApiKeyHashingService,
      ],
    }).compile();

  it('authenticates a tenant with a valid, active API key', async () => {
    const moduleRef = await createModule();
    const registerUseCase = moduleRef.get(RegisterTenantUseCaseImpl);
    const authenticateUseCase = moduleRef.get(AuthenticateTenantUseCaseImpl);

    const registered = await registerUseCase.execute({
      name: 'Umbrella',
      slug: `umbrella-${Date.now()}`,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    const result = await authenticateUseCase.execute(registered.value.apiKey);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(registered.value.tenant.id);
    }
  });

  it('rejects an unknown API key', async () => {
    const moduleRef = await createModule();
    const authenticateUseCase = moduleRef.get(AuthenticateTenantUseCaseImpl);

    const result = await authenticateUseCase.execute('sk_does-not-exist');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid_api_key');
    }
  });

  it('rejects a suspended tenant even with a previously valid API key', async () => {
    const moduleRef = await createModule();
    const registerUseCase = moduleRef.get(RegisterTenantUseCaseImpl);
    const authenticateUseCase = moduleRef.get(AuthenticateTenantUseCaseImpl);
    const tenantRepository = moduleRef.get<TenantRepository>(ITenantRepository);

    const registered = await registerUseCase.execute({
      name: 'Stark Industries',
      slug: `stark-${Date.now()}`,
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;

    await tenantRepository.save(registered.value.tenant.suspend());

    const result = await authenticateUseCase.execute(registered.value.apiKey);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('tenant_suspended');
    }
  });
});
