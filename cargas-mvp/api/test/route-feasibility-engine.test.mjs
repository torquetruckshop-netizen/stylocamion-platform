import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCargoGeometry, evaluateRouteFeasibility } from '../src/route-feasibility-engine.mjs';

test('calcula volumen y peso por densidad', () => {
  const result = calculateCargoGeometry({ lengthM: 10, widthM: 2.4, heightM: 2, densityKgM3: 500 });
  assert.equal(result.volume_m3, 48);
  assert.equal(result.estimated_weight_tn, 24);
});

test('bloquea sobrepeso y grupo de ejes excedido', () => {
  const result = evaluateRouteFeasibility({
    cargo: { weightTn: 30 },
    vehicle: {
      payloadCapacityTn: 28,
      tareWeightTn: 20,
      baseConsumptionL100Km: 32,
      axleGroups: [
        { id: 'TRACTOR', sharePct: 40, legalLimitTn: 18 },
        { id: 'TRAILER', sharePct: 60, legalLimitTn: 30 }
      ]
    },
    route: { distanceKm: 500, ascentM: 1200, descentM: 800 }
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('PAYLOAD_EXCEEDED'));
  assert.ok(result.blockers.includes('AXLE_LIMIT_EXCEEDED'));
  assert.ok(result.topography.adjusted_consumption_l_100km > 32);
});

test('no despacha automáticamente cuando falta revisión legal', () => {
  const result = evaluateRouteFeasibility({
    cargo: { weightTn: 20 },
    vehicle: { payloadCapacityTn: 28, tareWeightTn: 18 },
    legalRules: { requiresHumanReview: true }
  });
  assert.equal(result.status, 'REVIEW');
  assert.equal(result.auto_dispatch_allowed, false);
});
