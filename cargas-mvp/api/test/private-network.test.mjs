import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchPlan, nextEscalationLevel, chooseBestCandidate, privateNetworkOffer } from '../src/private-network-engine.mjs';

test('busca primero en flota propia y luego en red privada', () => {
  const plan = buildSearchPlan(
    { id: 'SC-1', escalation_level: 'OWN_FLEET' },
    { ownFleet: [{ vehicle_id: 'V1' }], privateNetwork: [{ vehicle_id: 'V2' }], allowStyloNetwork: false }
  );
  assert.equal(plan.steps[0].level, 'OWN_FLEET');
  assert.equal(plan.steps[1].level, 'PRIVATE_NETWORK');
});

test('escala a red privada antes que a red Stylo', () => {
  assert.equal(nextEscalationLevel('OWN_FLEET', { privateNetwork: true, styloNetwork: true }), 'PRIVATE_NETWORK');
  assert.equal(nextEscalationLevel('PRIVATE_NETWORK', { styloNetwork: true }), 'STYLO_NETWORK');
});

test('elige el mejor candidato por encima del umbral', () => {
  const best = chooseBestCandidate([
    { vehicle_id: 'V1', total_score: 91 },
    { vehicle_id: 'V2', total_score: 96 },
    { vehicle_id: 'V3', total_score: 87 }
  ], 90);
  assert.equal(best.vehicle_id, 'V2');
});

test('genera una oferta cerrada para la red privada', () => {
  const offer = privateNetworkOffer(
    { id: 'SC-2' },
    { vehicle_id: 'V7', carrier_id: 'C7' },
    'CARGAS_OP_01'
  );
  assert.deepEqual(offer.response_options, ['ACCEPT', 'REJECT', 'ASK_DETAILS']);
  assert.equal(offer.operation_channel_id, 'CARGAS_OP_01');
});
