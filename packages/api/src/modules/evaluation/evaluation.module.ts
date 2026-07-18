import { Module } from '@nestjs/common';
import { IFeatureFlagRepository, ITenantRepository } from '@flags/domain';
import { FeatureFlagRepositoryImpl } from '../flag/repository/feature.flag.repository.impl';
import { TenantRepositoryImpl } from '../tenant/repository/tenant.repository.impl';
import { EVALUATION_USECASES } from './usecases';
import { EvaluationUsecasesFactory } from './factory/evaluation.usecases.factory';
import { EvaluationController } from './evaluation.controller';

@Module({
  imports: [],
  controllers: [EvaluationController],
  providers: [
    { useClass: FeatureFlagRepositoryImpl, provide: IFeatureFlagRepository },
    { useClass: TenantRepositoryImpl, provide: ITenantRepository },
    ...EVALUATION_USECASES,
    EvaluationUsecasesFactory,
  ],
  exports: [EvaluationUsecasesFactory],
})
export class EvaluationModule {}
