import { Provider } from '@nestjs/common';
import {
  IAuthenticateTenantUseCase,
  IRegisterTenantUseCase,
} from '@flags/domain';
import { RegisterTenantUseCaseImpl } from './register.tenant.usecase.impl';
import { AuthenticateTenantUseCaseImpl } from './authenticate.tenant.usecase.impl';

export const TENANT_USECASES: Provider[] = [
  { useClass: RegisterTenantUseCaseImpl, provide: IRegisterTenantUseCase },
  {
    useClass: AuthenticateTenantUseCaseImpl,
    provide: IAuthenticateTenantUseCase,
  },
];
