import test from 'node:test';
import assert from 'node:assert/strict';
import { cargasEventToControlFacts } from '../src/cargas-control-adapter.mjs';
import { MemoryControlStore } from '../src/control-store.mjs';
import { createControlService } from '../src/control-service.mjs';

test('INTAKE_CLASSIFIED genera carga detectada y mensaje IA',()=>{
  const facts=cargasEventToControlFacts({id:'E1',type:'INTAKE_CLASSIFIED',load_id:'L1',source:'WHATSAPP',created_at:'2026-08-16T10:00:00Z',payload:{channel:'WHATSAPP'}});
  assert.equal(facts.length,2);
  assert.equal(facts[0].event_type,'LOAD_DETECTED');
  assert.equal(facts[0].channel,'WHATSAPP');
  assert.equal(facts[1].event_type,'AI_MESSAGE_PROCESSED');
});

test('AI_MATCH_DECISION genera match, decisión IA y km evitados',()=>{
  const facts=cargasEventToControlFacts({id:'E2',type:'AI_MATCH_DECISION',load_id:'L2',created_at:'2026-08-16T10:00:00Z',payload:{network_level:'OWN_FLEET',empty_km_avoided:74.5}});
  assert.deepEqual(facts.map(x=>x.event_type),['LOAD_MATCHED','AI_DECISION','EMPTY_KM_AVOIDED']);
  assert.equal(facts[2].value,74.5);
});

test('eventos repetidos no inflan métricas de Control',()=>{
  const store=new MemoryControlStore();
  const service=createControlService({store});
  const event={id:'E3',type:'AI_MATCH_DECISION',load_id:'L3',created_at:'2026-08-16T10:00:00Z',payload:{empty_km_avoided:20}};
  for(const fact of cargasEventToControlFacts(event)) service.recordFact({role:'ADMIN',fact});
  for(const fact of cargasEventToControlFacts(event)) service.recordFact({role:'ADMIN',fact});
  const overview=service.adminOverview({role:'ADMIN'});
  assert.equal(overview.sections.CARGAS.loads_matched.value,1);
  assert.equal(overview.sections.CARGAS.empty_km_avoided.value,20);
  assert.equal(overview.sections.AI.ai_decisions.value,1);
});
