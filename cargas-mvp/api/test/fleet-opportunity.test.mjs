import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTruckNeed, opportunityScore, rankTruckOpportunities } from '../src/fleet-opportunity-engine.mjs';

test('crea necesidad de carga a partir de disponibilidad futura', () => {
  const need = buildTruckNeed(
    { id: 'V12', carrier_id: 'C1', equipment_type: 'sider', capacity_tn: 28 },
    { available_from: '2026-08-14T15:00:00-03:00', expected_location_name: 'Córdoba', preferred_destinations: ['Santa Fe'] }
  );
  assert.equal(need.vehicle_id, 'V12');
  assert.equal(need.expected_location_name, 'Córdoba');
});

test('premia menos kilómetros vacíos y menos espera', () => {
  const a = opportunityScore({ matchScore: 94, emptyKm: 20, waitMinutes: 30, destinationPreference: true });
  const b = opportunityScore({ matchScore: 94, emptyKm: 180, waitMinutes: 180, destinationPreference: false });
  assert.ok(a > b);
});

test('ordena oportunidades por continuidad', () => {
  const ranked = rankTruckOpportunities([
    { id: 'L1', matchScore: 90, emptyKm: 80, waitMinutes: 90, destinationPreference: false },
    { id: 'L2', matchScore: 92, emptyKm: 10, waitMinutes: 30, destinationPreference: true }
  ]);
  assert.equal(ranked[0].id, 'L2');
});
