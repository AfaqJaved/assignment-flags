import { describe, it, expect } from 'vitest';
import { FeatureFlag } from './feature.flag.entity';

describe('FeatureFlag.isValidRolloutPercentage', () => {
  it('accepts the boundaries', () => {
    expect(FeatureFlag.isValidRolloutPercentage(0)).toBe(true);
    expect(FeatureFlag.isValidRolloutPercentage(100)).toBe(true);
  });

  it('accepts values in between', () => {
    expect(FeatureFlag.isValidRolloutPercentage(42.5)).toBe(true);
  });

  it('rejects values outside 0-100', () => {
    expect(FeatureFlag.isValidRolloutPercentage(-1)).toBe(false);
    expect(FeatureFlag.isValidRolloutPercentage(101)).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(FeatureFlag.isValidRolloutPercentage(Number.NaN)).toBe(false);
    expect(FeatureFlag.isValidRolloutPercentage(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe('FeatureFlag.isValueOfType', () => {
  it('matches boolean values to the boolean type', () => {
    expect(FeatureFlag.isValueOfType('boolean', true)).toBe(true);
    expect(FeatureFlag.isValueOfType('boolean', 'true')).toBe(false);
  });

  it('matches string values to the string type', () => {
    expect(FeatureFlag.isValueOfType('string', 'variant-a')).toBe(true);
    expect(FeatureFlag.isValueOfType('string', 1)).toBe(false);
  });

  it('matches number values to the number type', () => {
    expect(FeatureFlag.isValueOfType('number', 10)).toBe(true);
    expect(FeatureFlag.isValueOfType('number', '10')).toBe(false);
  });
});

describe('FeatureFlag lifecycle', () => {
  const create = () =>
    FeatureFlag.create({
      id: 'flag-1',
      tenantId: 'tenant-1',
      key: 'new-checkout',
      name: 'New checkout',
      type: 'boolean',
      defaultValue: false,
      createdBy: 'user-1',
    });

  it('starts disabled with 0% rollout in every environment', () => {
    const flag = create();
    expect(flag.getEnvironmentConfig('development').enabled).toBe(false);
    expect(flag.getEnvironmentConfig('staging').rolloutPercentage).toBe(0);
    expect(flag.getEnvironmentConfig('production').rolloutPercentage).toBe(0);
  });

  it('toggle only affects the targeted environment', () => {
    const flag = create().toggle('staging', true, 'user-2');
    expect(flag.getEnvironmentConfig('staging').enabled).toBe(true);
    expect(flag.getEnvironmentConfig('production').enabled).toBe(false);
    expect(flag.updatedBy).toBe('user-2');
  });

  it('archive flips status without touching environment configs', () => {
    const flag = create().toggle('production', true, 'user-2').archive('user-3');
    expect(flag.status).toBe('archived');
    expect(flag.isArchived()).toBe(true);
    expect(flag.getEnvironmentConfig('production').enabled).toBe(true);
  });
});
