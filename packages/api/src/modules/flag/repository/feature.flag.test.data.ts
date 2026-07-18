import { FeatureFlag } from '@flags/domain';

export const FEATURE_FLAG_TEST_DATA: FeatureFlag[] = [
  FeatureFlag.create({
    id: 'flag-new-checkout-1',
    tenantId: 'tenant-acme-1',
    key: 'new-checkout',
    name: 'New checkout',
    type: 'boolean',
    defaultValue: false,
    createdBy: 'user-1',
  }),
];
