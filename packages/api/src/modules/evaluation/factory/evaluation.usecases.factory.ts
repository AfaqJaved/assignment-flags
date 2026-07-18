import { Inject, Injectable } from '@nestjs/common';
import {
  IBulkEvaluateFlagsUseCase,
  IEvaluateFlagsUseCase,
} from '@flags/domain';
import type {
  BulkEvaluateFlagsUseCase,
  EvaluateFlagsUseCase,
} from '@flags/domain';

@Injectable()
export class EvaluationUsecasesFactory {
  @Inject(IEvaluateFlagsUseCase)
  public readonly evaluateFlagsUseCase: EvaluateFlagsUseCase;

  @Inject(IBulkEvaluateFlagsUseCase)
  public readonly bulkEvaluateFlagsUseCase: BulkEvaluateFlagsUseCase;
}
