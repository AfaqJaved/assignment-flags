import { EvaluatedFlag } from '@flags/domain';
import { EvaluatedFlagResponseDto } from '../dto/evaluated.flag.response.dto';

export function toEvaluatedFlagResponseDto(
  evaluated: EvaluatedFlag,
  cacheHit: boolean,
): EvaluatedFlagResponseDto {
  return {
    flagKey: evaluated.flagKey,
    value: evaluated.value,
    reason: evaluated.reason,
    cacheHit,
  };
}
