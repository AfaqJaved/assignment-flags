import { Provider } from '@nestjs/common';
import { IGetFlagHistoryUseCase } from '@flags/domain';
import { GetFlagHistoryUseCaseImpl } from './get.flag.history.usecase.impl';

export const AUDIT_USECASES: Provider[] = [
  { useClass: GetFlagHistoryUseCaseImpl, provide: IGetFlagHistoryUseCase },
];
