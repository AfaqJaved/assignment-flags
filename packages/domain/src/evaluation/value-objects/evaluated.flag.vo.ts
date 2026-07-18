import type { FlagValue } from '../../flag/types';
import type { EvaluationReason } from '../types';

export interface EvaluatedFlag {
  readonly flagKey: string;
  readonly value: FlagValue;
  readonly reason: EvaluationReason;
}
