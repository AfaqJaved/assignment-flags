import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { SecurityContext } from '../context/security.context';
import { TenantUsecasesFactory } from '../../../modules/tenant/factory/tenant.usecases.factory';
import { FlagsBaseErrorResponse } from '../../types/base.error.response';
import type { RequestWithTenant } from '../types/request-with-tenant';

// Routes bypassed from API key verification.
// Supports exact paths ('/api/v1/tenants') and wildcards ('/foo/*/bar').
const PUBLIC_ROUTES: string[] = [
  '/api/v1/tenants', // tenant registration — this is how a tenant gets its first API key
  '/api/v1/health', // container/orchestrator liveness probe — never has an API key
  '/docs', // swagger UI
  '/docs/*', // swagger UI static assets
  '/docs-json', // raw OpenAPI spec
];

function isPublicRoute(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0];

  return PUBLIC_ROUTES.some((route) => {
    if (!route.includes('*')) return path === route;
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -2);
      return path === prefix || path.startsWith(prefix + '/');
    }
    // mid-path wildcard: convert to regex where * matches one path segment
    const regex = new RegExp(
      '^' +
        route.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+') +
        '$',
    );
    return regex.test(path);
  });
}

/**
 * Every non-public request must carry a tenant API key in the `X-API-Key`
 * header. Verified via `AuthenticateTenantUseCase`, which populates
 * `SecurityContext` with the resolved tenant.
 */
@Injectable()
export class ApiKeyAuthenticationMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantUsecasesFactory: TenantUsecasesFactory,
    private readonly securityContext: SecurityContext,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    if (isPublicRoute(req.originalUrl)) return next();

    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          new FlagsBaseErrorResponse(
            'Missing X-API-Key header',
            HttpStatus.UNAUTHORIZED,
          ),
        );
    }

    const result =
      await this.tenantUsecasesFactory.authenticateTenantUseCase.execute(
        apiKey,
      );

    if (!result.ok) {
      if (result.error.kind === 'tenant_suspended')
        return res
          .status(HttpStatus.FORBIDDEN)
          .json(
            new FlagsBaseErrorResponse(
              result.error.message,
              HttpStatus.FORBIDDEN,
            ),
          );

      if (result.error.kind === 'invalid_api_key')
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json(
            new FlagsBaseErrorResponse(
              result.error.message,
              HttpStatus.UNAUTHORIZED,
            ),
          );

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(
          new FlagsBaseErrorResponse(
            'Something went wrong. Please try again later.',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        );
    }

    this.securityContext.tenantId = result.value.id;
    this.securityContext.tenantSlug = result.value.slug;
    req.tenantId = result.value.id;

    next();
  }
}
