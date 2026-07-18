import { Tenant } from '@flags/domain';

const now = new Date();

export const TENANT_TEST_DATA: Tenant[] = [
  Tenant.create({
    id: 'tenant-acme-1',
    name: 'Acme Inc',
    slug: 'acme-inc',
    apiKeyHash: 'hashed_api_key_acme',
  }),
  Tenant.reconstitute({
    id: 'tenant-suspended-1',
    name: 'Suspended Co',
    slug: 'suspended-co',
    apiKeyHash: 'hashed_api_key_suspended',
    status: 'suspended',
    createdAt: now,
    updatedAt: now,
  }),
];
