import { Inject, Injectable } from '@nestjs/common';
import {
  IAuthenticateTenantUseCase,
  IRegisterTenantUseCase,
} from '@flags/domain';
import type {
  AuthenticateTenantUseCase,
  RegisterTenantUseCase,
} from '@flags/domain';

@Injectable()
export class TenantUsecasesFactory {
  @Inject(IRegisterTenantUseCase)
  public readonly registerTenantUseCase: RegisterTenantUseCase;

  @Inject(IAuthenticateTenantUseCase)
  public readonly authenticateTenantUseCase: AuthenticateTenantUseCase;
}
