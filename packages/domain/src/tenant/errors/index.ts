import type { ErrorShape } from '../../shared';

/** No tenant was found for the given lookup value. @example { kind: 'tenant_not_found', message: 'Tenant not found by slug', timestamp, by: 'slug', value: 'acme-inc' } */
export type TenantNotFoundError = ErrorShape & {
  kind: 'tenant_not_found';
  by: 'id' | 'slug' | 'apiKey';
  value: string;
};

/** A tenant with the same slug or name already exists. @example { kind: 'tenant_already_exists', message: 'Slug already taken', timestamp, field: 'slug' } */
export type TenantAlreadyExistsError = ErrorShape & {
  kind: 'tenant_already_exists';
  field: 'slug' | 'name';
};

/** Tenant account has been suspended and cannot authenticate or serve config. */
export type TenantSuspendedError = ErrorShape & { kind: 'tenant_suspended' };

/** The API key provided does not match any tenant. */
export type InvalidApiKeyError = ErrorShape & { kind: 'invalid_api_key' };

/** The requested environment is not one of the tenant's fixed environments. @example { kind: 'environment_not_supported', message: 'Unknown environment', timestamp, environment: 'preprod' } */
export type EnvironmentNotSupportedError = ErrorShape & {
  kind: 'environment_not_supported';
  environment: string;
};
