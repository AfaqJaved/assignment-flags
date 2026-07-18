/** The caller's identity plus arbitrary context attributes used for targeting and bucketing. */
export interface EvaluationContext {
  readonly userId: string;
  readonly attributes: Record<string, string | number | boolean>;
}

/** Why a flag resolved to the value it did — surfaced for debugging and observability. */
export type EvaluationReason =
  'flag_not_found' | 'flag_disabled' | 'flag_archived' | 'rollout' | 'default';
