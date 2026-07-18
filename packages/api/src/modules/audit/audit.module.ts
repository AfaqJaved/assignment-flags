import { Module } from '@nestjs/common';
import { IAuditLogRepository, IFeatureFlagRepository } from '@flags/domain';
import { AuditLogRepositoryImpl } from './repository/audit.log.repository.impl';
import { FeatureFlagRepositoryImpl } from '../flag/repository/feature.flag.repository.impl';
import { AUDIT_USECASES } from './usecases';
import { AuditUsecasesFactory } from './factory/audit.usecases.factory';
import { AuditController } from './audit.controller';

@Module({
  imports: [],
  controllers: [AuditController],
  providers: [
    { useClass: AuditLogRepositoryImpl, provide: IAuditLogRepository },
    { useClass: FeatureFlagRepositoryImpl, provide: IFeatureFlagRepository },
    ...AUDIT_USECASES,
    AuditUsecasesFactory,
  ],
  exports: [AuditUsecasesFactory],
})
export class AuditModule {}
