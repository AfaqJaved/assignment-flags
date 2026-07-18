import { Inject, Injectable } from '@nestjs/common';
import { IGetFlagHistoryUseCase } from '@flags/domain';
import type { GetFlagHistoryUseCase } from '@flags/domain';

@Injectable()
export class AuditUsecasesFactory {
  @Inject(IGetFlagHistoryUseCase)
  public readonly getFlagHistoryUseCase: GetFlagHistoryUseCase;
}
