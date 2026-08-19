import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningSnapshot, outcomeReward } from '../src/learning-feedback-engine.mjs';

test('premia una operación rentable, completa y puntual', () => {
  const reward = outcomeReward({ accepted: true, completed: true, onTime: true, actualMarginPct: 18, actualEmptyKm: 20 });
  assert.ok(reward > 0.8);
});

test('aprende con límites y protege reglas críticas', () => {
  const outcomes = Array.from({ length: 12 }, (_, index) => ({
    matchId: `M${index}`,
    accepted: index < 9,
    completed: index < 8,
    onTime: index < 7,
    actualMarginPct: 12,
    actualEmptyKm: 40
  }));
  const snapshot = buildLearningSnapshot(outcomes);
  assert.equal(snapshot.ready_for_recommendation_tuning, true);
  assert.ok(snapshot.recommended_score_adjustment <= 3);
  assert.ok(snapshot.protected_rules.includes('LEGAL_COMPLIANCE'));
  assert.ok(snapshot.protected_rules.includes('COMMISSION'));
});
