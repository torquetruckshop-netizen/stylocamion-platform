export const LEARNING_FEEDBACK_VERSION = 'learning-feedback-v1';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

export function normalizeOutcome(input = {}) {
  const accepted = input.accepted === true;
  const completed = input.completed === true;
  const margin = Number(input.actualMarginPct);
  const emptyKm = Number(input.actualEmptyKm);
  const onTime = input.onTime === true;
  return {
    match_id: input.matchId || null,
    vehicle_id: input.vehicleId || null,
    corridor_key: input.corridorKey || null,
    accepted,
    completed,
    on_time: onTime,
    actual_margin_pct: Number.isFinite(margin) ? margin : null,
    actual_empty_km: Number.isFinite(emptyKm) && emptyKm >= 0 ? emptyKm : null,
    rejection_reason: accepted ? null : input.rejectionReason || 'UNKNOWN',
    observed_at: input.observedAt || new Date().toISOString()
  };
}

export function outcomeReward(outcome = {}) {
  const value = normalizeOutcome(outcome);
  let reward = value.accepted ? 0.35 : -0.3;
  if (value.completed) reward += 0.3;
  if (value.on_time) reward += 0.15;
  if (value.actual_margin_pct != null) reward += clamp(value.actual_margin_pct / 100, -0.2, 0.2);
  if (value.actual_empty_km != null) reward -= clamp(value.actual_empty_km / 1000, 0, 0.2);
  return round(clamp(reward, -1, 1));
}

export function buildLearningSnapshot(outcomes = [], { minimumSamples = 10 } = {}) {
  const normalized = outcomes.map(normalizeOutcome);
  const rewards = normalized.map(outcomeReward);
  const sampleCount = rewards.length;
  const averageReward = sampleCount ? round(rewards.reduce((sum, value) => sum + value, 0) / sampleCount) : null;
  const acceptanceRate = sampleCount ? round(normalized.filter(item => item.accepted).length / sampleCount) : null;
  const completionRate = sampleCount ? round(normalized.filter(item => item.completed).length / sampleCount) : null;
  return {
    version: LEARNING_FEEDBACK_VERSION,
    sample_count: sampleCount,
    ready_for_recommendation_tuning: sampleCount >= minimumSamples,
    average_reward: averageReward,
    acceptance_rate: acceptanceRate,
    completion_rate: completionRate,
    // The engine recommends bounded tuning; it never changes legal/commercial rules itself.
    recommended_score_adjustment: sampleCount >= minimumSamples ? round(clamp(averageReward * 5, -3, 3), 2) : 0,
    protected_rules: ['LEGAL_COMPLIANCE', 'PAYMENT', 'COMMISSION', 'ACCOUNT_SUSPENSION']
  };
}
