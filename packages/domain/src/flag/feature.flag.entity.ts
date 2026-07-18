// ── Props ─────────────────────────────────────────────────────────────────────

import type { Environment } from '../tenant/types';
import type { FlagStatus, FlagType, FlagValue } from './types';
import type { FlagEnvironmentConfig } from './value-objects';

export interface FeatureFlagProps {
  readonly id: string;
  readonly tenantId: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: FlagType;
  readonly defaultValue: FlagValue;
  readonly status: FlagStatus;
  readonly environments: Readonly<Record<Environment, FlagEnvironmentConfig>>;

  readonly createdAt: Date;
  readonly createdBy: string;
  readonly updatedAt: Date;
  readonly updatedBy: string;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateFeatureFlagInput {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  type: FlagType;
  defaultValue: FlagValue;
  createdBy: string;
}

// ── Entity ────────────────────────────────────────────────────────────────────

export class FeatureFlag {
  private readonly props: FeatureFlagProps;

  private constructor(props: FeatureFlagProps) {
    this.props = props;
  }

  /**
   * Creates a brand-new flag, disabled with 0% rollout in every environment.
   * Use this in application use-cases, never for rehydrating persisted data.
   */
  static create(input: CreateFeatureFlagInput): FeatureFlag {
    const now = new Date();
    const defaultEnvironmentConfig: FlagEnvironmentConfig = {
      enabled: false,
      rolloutPercentage: 0,
    };
    return new FeatureFlag({
      id: input.id,
      tenantId: input.tenantId,
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      defaultValue: input.defaultValue,
      status: 'active',
      environments: {
        development: defaultEnvironmentConfig,
        staging: defaultEnvironmentConfig,
        production: defaultEnvironmentConfig,
      },
      createdAt: now,
      createdBy: input.createdBy,
      updatedAt: now,
      updatedBy: input.createdBy,
    });
  }

  /**
   * Reconstitutes a FeatureFlag from already-validated data (e.g. a database row).
   * Never call with raw untrusted input.
   */
  static reconstitute(props: FeatureFlagProps): FeatureFlag {
    return new FeatureFlag(props);
  }

  // ── Invariants ─────────────────────────────────────────────────────────────

  static isValidRolloutPercentage(percentage: number): boolean {
    return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
  }

  static isValueOfType(type: FlagType, value: FlagValue): boolean {
    return typeof value === type;
  }

  // ── Identity ───────────────────────────────────────────────────────────────

  get id(): string {
    return this.props.id;
  }

  equals(other: FeatureFlag): boolean {
    return this.props.id === other.props.id;
  }

  // ── Core fields ────────────────────────────────────────────────────────────

  get tenantId(): string {
    return this.props.tenantId;
  }
  get key(): string {
    return this.props.key;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get type(): FlagType {
    return this.props.type;
  }
  get defaultValue(): FlagValue {
    return this.props.defaultValue;
  }
  get status(): FlagStatus {
    return this.props.status;
  }

  // ── Audit fields ───────────────────────────────────────────────────────────

  get createdAt(): Date {
    return this.props.createdAt;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get updatedBy(): string {
    return this.props.updatedBy;
  }

  isArchived(): boolean {
    return this.props.status === 'archived';
  }

  getEnvironmentConfig(environment: Environment): FlagEnvironmentConfig {
    return this.props.environments[environment];
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  toggle(environment: Environment, enabled: boolean, updatedBy: string): FeatureFlag {
    return this.patchEnvironment(environment, { enabled }, updatedBy);
  }

  updateRolloutPercentage(
    environment: Environment,
    rolloutPercentage: number,
    updatedBy: string,
  ): FeatureFlag {
    return this.patchEnvironment(environment, { rolloutPercentage }, updatedBy);
  }

  updateDefaultValue(defaultValue: FlagValue, updatedBy: string): FeatureFlag {
    return new FeatureFlag({ ...this.props, defaultValue, updatedAt: new Date(), updatedBy });
  }

  archive(updatedBy: string): FeatureFlag {
    return new FeatureFlag({ ...this.props, status: 'archived', updatedAt: new Date(), updatedBy });
  }

  private patchEnvironment(
    environment: Environment,
    patch: Partial<FlagEnvironmentConfig>,
    updatedBy: string,
  ): FeatureFlag {
    return new FeatureFlag({
      ...this.props,
      environments: {
        ...this.props.environments,
        [environment]: { ...this.props.environments[environment], ...patch },
      },
      updatedAt: new Date(),
      updatedBy,
    });
  }
}
