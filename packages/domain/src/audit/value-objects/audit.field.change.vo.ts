export interface AuditFieldChange {
  readonly field: string;
  readonly previousValue: unknown;
  readonly newValue: unknown;
}
