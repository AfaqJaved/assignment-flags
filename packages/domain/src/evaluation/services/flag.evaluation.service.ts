import type { Environment } from '../../tenant/types';
import type { FeatureFlag } from '../../flag/feature.flag.entity';
import type { EvaluatedFlag } from '../value-objects';
import type { EvaluationContext } from '../types';
import { DeterministicRolloutService } from './deterministic.rollout.service';

/**
 * Resolves a single flag's value for a user/context, in this precedence order:
 * 1. Archived flag       → default value
 * 2. Disabled in env      → default value
 * 3. Rollout percentage   → `true` if in rollout, else the default value
 */
export class FlagEvaluationService {
  static evaluate(
    flag: FeatureFlag,
    environment: Environment,
    context: EvaluationContext,
  ): EvaluatedFlag {
    if (flag.isArchived()) {
      return { flagKey: flag.key, value: flag.defaultValue, reason: 'flag_archived' };
    }

    const envConfig = flag.getEnvironmentConfig(environment);

    if (!envConfig.enabled) {
      return { flagKey: flag.key, value: flag.defaultValue, reason: 'flag_disabled' };
    }

    const inRollout = DeterministicRolloutService.isInRollout(
      flag.key,
      context.userId,
      envConfig.rolloutPercentage,
    );

    return {
      flagKey: flag.key,
      value: inRollout ? true : flag.defaultValue,
      reason: inRollout ? 'rollout' : 'default',
    };
  }
}
