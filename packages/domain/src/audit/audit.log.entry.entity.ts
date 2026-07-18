// ── Props ─────────────────────────────────────────────────────────────────────

import type { Environment } from '../tenant/types';
import type { AuditAction } from './types';
import type { AuditFieldChange } from './value-objects';

export interface AuditLogEntryProps {
  readonly id: string;
  readonly tenantId: string;
  readonly flagId: string;
  readonly flagKey: string;
  readonly environment: Environment | null;
  readonly action: AuditAction;
  readonly changes: AuditFieldChange[];
  readonly actorId: string;
  readonly createdAt: Date;
}

// ── Create input ──────────────────────────────────────────────────────────────

export interface CreateAuditLogEntryInput {
  id: string;
  tenantId: string;
  flagId: string;
  flagKey: string;
  environment: Environment | null;
  action: AuditAction;
  changes: AuditFieldChange[];
  actorId: string;
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * A single, immutable audit record. Audit records are append-only — this
 * entity intentionally exposes no mutation methods; once created, a record
 * can never be changed, only superseded by a newer entry.
 */
export class AuditLogEntry {
  private readonly props: AuditLogEntryProps;

  private constructor(props: AuditLogEntryProps) {
    this.props = props;
  }

  static create(input: CreateAuditLogEntryInput): AuditLogEntry {
    return new AuditLogEntry({
      id: input.id,
      tenantId: input.tenantId,
      flagId: input.flagId,
      flagKey: input.flagKey,
      environment: input.environment,
      action: input.action,
      changes: input.changes,
      actorId: input.actorId,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitutes an AuditLogEntry from already-validated data (e.g. a database row).
   * Never call with raw untrusted input.
   */
  static reconstitute(props: AuditLogEntryProps): AuditLogEntry {
    return new AuditLogEntry(props);
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get flagId(): string {
    return this.props.flagId;
  }
  get flagKey(): string {
    return this.props.flagKey;
  }
  get environment(): Environment | null {
    return this.props.environment;
  }
  get action(): AuditAction {
    return this.props.action;
  }
  get changes(): AuditFieldChange[] {
    return this.props.changes;
  }
  get actorId(): string {
    return this.props.actorId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
