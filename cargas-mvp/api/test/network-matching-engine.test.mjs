import test from 'node:test';
import assert from 'node:assert/strict';
import { runPriorityMatching } from '../src/network-matching-engine.mjs';

const load = {
  id:'SC-TEST',
  traffic_light:'GREEN',
  missing_fields:[],
  equipment_required:'chasis + acoplado',
  weight_tn:28
};

function candidate(id, { capacity=30, reputation=4.8, equipment='chasis + acoplado' } = {}) {
  return {
    vehicle:{
      id,
      carrier_id:`C-${id}`,
      equipment_type:equipment,
      capacity_tn:capacity,
      availability:'AVAILABLE',
      document_state:'GREEN'
    },
    carrier:{ id:`C-${id}`, status:'ACTIVE', reputation_score:reputation }
  };
}

test('prioriza Mi Flota aunque Red Privada tenga un puntaje algo mejor', async () => {
  const result = await runPriorityMatching({
    load,
    ownFleet:[candidate('OWN-1',{reputation:4.5})],
    privateNetwork:[candidate('PRIVATE-1',{reputation:5})],
    styloNetwork:[candidate('STYLO-1',{reputation:5})],
    distanceResolver:async ({level}) => level === 'OWN_FLEET' ? 40 : 5
  });

  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.network_level,'OWN_FLEET');
  assert.equal(result.selected.vehicle.id,'OWN-1');
  assert.equal(result.next_action,'PROPOSE_TO_OWN_FLEET');
  assert.equal(result.trace.length,1);
});

test('rechaza sobrecarga en Mi Flota y escala a Red Privada', async () => {
  const result = await runPriorityMatching({
    load,
    ownFleet:[candidate('OWN-SMALL',{capacity:20})],
    privateNetwork:[candidate('PRIVATE-OK',{capacity:30})],
    styloNetwork:[candidate('STYLO-OK',{capacity:30})],
    distanceResolver:async () => 20
  });

  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.network_level,'PRIVATE_NETWORK');
  assert.equal(result.selected.vehicle.id,'PRIVATE-OK');
  assert.equal(result.trace.length,2);
  assert.deepEqual(result.trace[0].rejection_reasons[0].reasons,['OVER_CAPACITY']);
});

test('una carga incompleta no se ofrece automáticamente', async () => {
  const result = await runPriorityMatching({
    load:{...load,traffic_light:'YELLOW',missing_fields:['equipment_required']},
    ownFleet:[candidate('OWN-1')],
    distanceResolver:async () => 5
  });

  assert.equal(result.status,'NEEDS_VALIDATION');
  assert.equal(result.selected,null);
});
