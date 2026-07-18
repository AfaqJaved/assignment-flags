import { Global, Module } from '@nestjs/common';
import { SecurityContext } from './context/security.context';
import { ApiKeyAuthenticationMiddleware } from './middleware/api.key.authentication.middleware';
import { TenantModule } from '../../modules/tenant/tenant.module';

@Global()
@Module({
  imports: [TenantModule],
  providers: [SecurityContext, ApiKeyAuthenticationMiddleware],
  exports: [SecurityContext, ApiKeyAuthenticationMiddleware],
})
export class FlagsSecurityModule {}
