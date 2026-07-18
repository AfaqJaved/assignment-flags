// ── Enums ─────────────────────────────────────────────────────────────────────

/** The environments every tenant is scoped into. Fixed set — not configurable per tenant. */
export type Environment = 'development' | 'staging' | 'production';

export const ENVIRONMENTS: readonly Environment[] = ['development', 'staging', 'production'];

export type TenantStatus = 'active' | 'suspended';
