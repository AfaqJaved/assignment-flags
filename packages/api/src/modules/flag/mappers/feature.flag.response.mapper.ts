import { ENVIRONMENTS, FeatureFlag } from '@flags/domain';
import { FeatureFlagResponseDto } from '../dto/feature.flag.response.dto';

export function toFeatureFlagResponseDto(
  flag: FeatureFlag,
): FeatureFlagResponseDto {
  return {
    id: flag.id,
    tenantId: flag.tenantId,
    key: flag.key,
    name: flag.name,
    description: flag.description,
    type: flag.type,
    defaultValue: flag.defaultValue,
    status: flag.status,
    environments: Object.fromEntries(
      ENVIRONMENTS.map((environment) => [
        environment,
        flag.getEnvironmentConfig(environment),
      ]),
    ) as FeatureFlagResponseDto['environments'],
    createdAt: flag.createdAt,
    createdBy: flag.createdBy,
    updatedAt: flag.updatedAt,
    updatedBy: flag.updatedBy,
  };
}
