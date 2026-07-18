import type { Request } from 'express';

/**
 * The tenant is also stamped directly on the request (alongside the
 * request-scoped `SecurityContext`) so singleton-scoped consumers — like
 * `TenantThrottlerGuard`, which must stay singleton-scoped for
 * `ThrottlerGuard`'s own `onModuleInit` lifecycle to run — can read it
 * without injecting a request-scoped provider and cascading their own scope.
 */
export interface RequestWithTenant extends Request {
  tenantId?: string;
}
