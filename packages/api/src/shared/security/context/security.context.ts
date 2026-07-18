import { Injectable, Scope } from '@nestjs/common';

/** Populated per-request by `ApiKeyAuthenticationMiddleware` once the API key has been verified. */
@Injectable({ scope: Scope.REQUEST })
export class SecurityContext {
  tenantId: string;
  tenantSlug: string;
}
