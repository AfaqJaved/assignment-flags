import { Module } from '@nestjs/common';
import { ITenantRepository } from '@flags/domain';
import { TenantRepositoryImpl } from './repository/tenant.repository.impl';
import { TENANT_USECASES } from './usecases';
import { TenantUsecasesFactory } from './factory/tenant.usecases.factory';
import { ApiKeyHashingService } from '../../shared/security/hashing/api.key.hashing.service';
import { TenantController } from './tenant.controller';

@Module({
  imports: [],
  controllers: [TenantController],
  providers: [
    { useClass: TenantRepositoryImpl, provide: ITenantRepository },
    ApiKeyHashingService,
    ...TENANT_USECASES,
    TenantUsecasesFactory,
  ],
  exports: [TenantUsecasesFactory],
})
export class TenantModule {}
