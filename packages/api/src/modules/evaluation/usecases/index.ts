import { Provider } from '@nestjs/common';
import {
  IBulkEvaluateFlagsUseCase,
  IEvaluateFlagsUseCase,
} from '@flags/domain';
import { EvaluateFlagsUseCaseImpl } from './evaluate.flags.usecase.impl';
import { BulkEvaluateFlagsUseCaseImpl } from './bulk.evaluate.flags.usecase.impl';

export const EVALUATION_USECASES: Provider[] = [
  { useClass: EvaluateFlagsUseCaseImpl, provide: IEvaluateFlagsUseCase },
  {
    useClass: BulkEvaluateFlagsUseCaseImpl,
    provide: IBulkEvaluateFlagsUseCase,
  },
];
