import { Module } from '@nestjs/common';
import { IAuditLogRepository, IFeatureFlagRepository } from '@flags/domain';
import { AuditLogRepositoryImpl } from '../audit/repository/audit.log.repository.impl';
import { FeatureFlagRepositoryImpl } from './repository/feature.flag.repository.impl';
import { FLAG_USECASES } from './usecases';
import { FlagUsecasesFactory } from './factory/flag.usecases.factory';
import { FlagController } from './flag.controller';

@Module({
  imports: [],
  controllers: [FlagController],
  providers: [
    { useClass: FeatureFlagRepositoryImpl, provide: IFeatureFlagRepository },
    { useClass: AuditLogRepositoryImpl, provide: IAuditLogRepository },
    ...FLAG_USECASES,
    FlagUsecasesFactory,
  ],
  exports: [FlagUsecasesFactory],
})
export class FlagModule {}
