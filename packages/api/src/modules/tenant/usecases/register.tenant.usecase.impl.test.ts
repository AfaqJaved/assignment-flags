import { Test, TestingModule } from '@nestjs/testing';
import { ITenantRepository } from '@flags/domain';

// Mock uuid to avoid ESM parsing issues
jest.mock('uuid', () => ({
  v7: jest.fn(() => crypto.randomUUID()),
}));

import { TenantRepositoryTestImpl } from '../repository/tenant.repository.fake.impl';
import { ApiKeyHashingService } from '../../../shared/security/hashing/api.key.hashing.service';
import { RegisterTenantUseCaseImpl } from './register.tenant.usecase.impl';

describe('RegisterTenantUseCaseImpl', () => {
  const createUseCase = async (): Promise<RegisterTenantUseCaseImpl> => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterTenantUseCaseImpl,
        { provide: ITenantRepository, useClass: TenantRepositoryTestImpl },
        ApiKeyHashingService,
      ],
    }).compile();

    return moduleRef.get(RegisterTenantUseCaseImpl);
  };

  it('registers a new tenant and returns a plaintext API key', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      name: 'Globex',
      slug: `globex-${Date.now()}`,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tenant.name).toBe('Globex');
      expect(result.value.tenant.isActive()).toBe(true);
      expect(result.value.apiKey.startsWith('sk_')).toBe(true);
      // the stored hash must never equal the plaintext key
      expect(result.value.tenant.apiKeyHash).not.toBe(result.value.apiKey);
    }
  });

  it('rejects a slug that is already registered', async () => {
    const useCase = await createUseCase();

    const result = await useCase.execute({
      name: 'Acme Inc',
      slug: 'acme-inc',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('tenant_already_exists');
    }
  });

  it('hashes the API key deterministically so it can later be looked up', async () => {
    const useCase = await createUseCase();
    const hasher = new ApiKeyHashingService();

    const result = await useCase.execute({
      name: 'Initech',
      slug: `initech-${Date.now()}`,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(hasher.hash(result.value.apiKey)).toBe(
        result.value.tenant.apiKeyHash,
      );
    }
  });
});
