import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createLoadDecisionOrchestrator } from '../src/load-decision-orchestrator.mjs';

const load = {
  id:'SC-AUDIT-1',
  traffic_light:'GREEN',
  missing_fields:[],
  equipment_required:'chasis + acoplado',
  weight_tn:28
};

function candidate(id, { capacity=30, reputation=5 } = {}) {
  return {
    vehicle:{
      id,
      carrier_id:`C-${id}`,
      equipment_type:'chasis + acoplado',
      capacity_tn:capacity,
      availability:'AVAILABLE',
      document_state:'GREEN'
    },
    carrier:{ id:`C-${id}`, status:'ACTIVE', reputation_score:reputation }
  };
}

test('match fuerte genera traza auditable y alerta en outbox', async () => {
  const store = new MemoryStore({loads:[load]});
  const decide = createLoadDecisionOrchestrator({
    store,
    distanceResolver:async () => 0
  });

  const result = await decide({
    load,
    ownFleet:[candidate('OWN-1')],
    targetUserId:'11111111-1111-1111-1111-111111111111'
  });

  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.network_level,'OWN_FLEET');
  assert.equal(result.alert_status,'QUEUED');
  assert.equal(store.listNotificationOutbox().length,1);
  assert.equal(store.listNotificationOutbox()[0].channel,'PUSH');

  const decisionEvent = store.events.find(x => x.type === 'AI_MATCH_DECISION');
  assert.ok(decisionEvent);
  assert.equal(decisionEvent.payload.decision_version,'stylo-network-priority-v1');
  assert.equal(decisionEvent.payload.selected.vehicle_id,'OWN-1');
  assert.equal(decisionEvent.payload.trace[0].evaluated_candidates[0].eligible,true);
});

test('repetir la misma decisión no duplica la alerta', async () => {
  const store = new MemoryStore({loads:[load]});
  const decide = createLoadDecisionOrchestrator({ store, distanceResolver:async () => 0 });
  const args = {
    load,
    ownFleet:[candidate('OWN-1')],
    targetUserId:'11111111-1111-1111-1111-111111111111'
  };

  await decide(args);
  await decide(args);

  assert.equal(store.listNotificationOutbox().length,1);
  assert.equal(store.events.filter(x => x.type === 'AI_MATCH_DECISION').length,2);
});

test('carga incompleta queda silenciosa pero mantiene decisión auditable', async () => {
  const incomplete = {...load,id:'SC-AUDIT-2',traffic_light:'YELLOW',missing_fields:['equipment_required']};
  const store = new MemoryStore({loads:[incomplete]});
  const decide = createLoadDecisionOrchestrator({ store, distanceResolver:async () => 0 });

  const result = await decide({
    load:incomplete,
    ownFleet:[candidate('OWN-1')],
    targetUserId:'11111111-1111-1111-1111-111111111111'
  });

  assert.equal(result.status,'NEEDS_VALIDATION');
  assert.equal(result.alert_status,'SILENT_BY_POLICY');
  assert.equal(store.listNotificationOutbox().length,0);
  assert.equal(store.events.filter(x => x.type === 'AI_MATCH_DECISION').length,1);
});

test('sin unidad elegible genera alerta de acción requerida', async () => {
  const store = new MemoryStore({loads:[load]});
  const decide = createLoadDecisionOrchestrator({ store, distanceResolver:async () => 10 });

  const result = await decide({
    load,
    ownFleet:[candidate('OWN-SMALL',{capacity:10})],
    privateNetwork:[],
    styloNetwork:[],
    targetUserId:'11111111-1111-1111-1111-111111111111'
  });

  assert.equal(result.status,'NO_ELIGIBLE_MATCH');
  assert.equal(result.alert_status,'QUEUED');
  assert.equal(store.listNotificationOutbox()[0].channel,'PUSH_WHATSAPP');
  assert.equal(store.listNotificationOutbox()[0].priority,'HIGH');
});
