import { AuditLogEntry } from '@flags/domain';

export const AUDIT_LOG_TEST_DATA: AuditLogEntry[] = [
  AuditLogEntry.create({
    id: 'audit-1',
    tenantId: 'tenant-acme-1',
    flagId: 'flag-new-checkout-1',
    flagKey: 'new-checkout',
    environment: null,
    action: 'flag_created',
    changes: [],
    actorId: 'user-1',
  }),
];
