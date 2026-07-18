// ── Props ─────────────────────────────────────────────────────────────────────

import type { TenantStatus } from './types';

export interface TenantProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly apiKeyHash: string;
  readonly status: TenantStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateTenantInput {
  id: string;
  name: string;
  slug: string;
  apiKeyHash: string;
}

// ── Entity ────────────────────────────────────────────────────────────────────

export class Tenant {
  private readonly props: TenantProps;

  private constructor(props: TenantProps) {
    this.props = props;
  }

  /**
   * Registers a brand-new tenant (application) with business defaults applied.
   * Use this in application use-cases, never for rehydrating persisted data.
   */
  static create(input: CreateTenantInput): Tenant {
    const now = new Date();
    return new Tenant({
      id: input.id,
      name: input.name,
      slug: input.slug,
      apiKeyHash: input.apiKeyHash,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a Tenant from already-validated data (e.g. a database row).
   * Never call with raw untrusted input.
   */
  static reconstitute(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  // ── Identity ───────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  equals(other: Tenant): boolean {
    return this.props.id === other.props.id;
  }

  // ── Core fields ────────────────────────────────────────────────────────────

  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get apiKeyHash(): string {
    return this.props.apiKeyHash;
  }
  get status(): TenantStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isActive(): boolean {
    return this.props.status === 'active';
  }

  // ── State transitions ─────────────────────────────────────────────────────

  suspend(): Tenant {
    return new Tenant({ ...this.props, status: 'suspended', updatedAt: new Date() });
  }

  activate(): Tenant {
    return new Tenant({ ...this.props, status: 'active', updatedAt: new Date() });
  }

  rotateApiKey(apiKeyHash: string): Tenant {
    return new Tenant({ ...this.props, apiKeyHash, updatedAt: new Date() });
  }
}
