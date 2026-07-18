import { ENVIRONMENTS, FeatureFlag } from '@flags/domain';
import {
  FeatureFlagTableInsert,
  FeatureFlagTableSelect,
} from '../../../shared/database/schema/feature.flag.table';

export class FeatureFlagPersistenceMapper {
  public persistenceToDomain(row: FeatureFlagTableSelect): FeatureFlag {
    return FeatureFlag.reconstitute({
      id: row.id,
      tenantId: row.tenant_id,
      key: row.key,
      name: row.name,
      description: row.description,
      type: row.type,
      defaultValue: row.default_value,
      status: row.status,
      environments: row.environments,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    });
  }

  public domainToPersistence(flag: FeatureFlag): FeatureFlagTableInsert {
    return {
      id: flag.id,
      tenant_id: flag.tenantId,
      key: flag.key,
      name: flag.name,
      description: flag.description,
      type: flag.type,
      default_value: flag.defaultValue,
      status: flag.status,
      environments: Object.fromEntries(
        ENVIRONMENTS.map((environment) => [
          environment,
          flag.getEnvironmentConfig(environment),
        ]),
      ) as FeatureFlagTableInsert['environments'],
      created_at: flag.createdAt,
      created_by: flag.createdBy,
      updated_at: flag.updatedAt,
      updated_by: flag.updatedBy,
    };
  }
}
