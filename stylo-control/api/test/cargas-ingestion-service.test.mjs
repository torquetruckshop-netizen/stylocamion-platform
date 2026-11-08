import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryControlStore } from '../src/control-store.mjs';
import { createControlService } from '../src/control-service.mjs';
import { createCargasIngestionService } from '../src/cargas-ingestion-service.mjs';

test('ingesta por lote alimenta métricas y marca Cargas saludable',()=>{
  let now=new Date('2026-08-16T10:00:00Z');
  const store=new MemoryControlStore();
  const control=createControlService({store});
  const ingest=createCargasIngestionService({controlService:control,now:()=>now});
  const result=ingest.ingest({events:[
    {id:'E1',type:'INTAKE_CLASSIFIED',load_id:'L1',source:'WHATSAPP',created_at:'2026-08-16T09:59:00Z'},
    {id:'E2',type:'AI_MATCH_DECISION',load_id:'L1',created_at:'2026-08-16T10:00:00Z',payload:{empty_km_avoided:35}}
  ]});
  assert.equal(result.events_received,2);
  const overview=control.adminOverview({role:'ADMIN'});
  assert.equal(overview.sections.CARGAS.loads_detected.value,1);
  assert.equal(overview.sections.CARGAS.loads_matched.value,1);
  assert.equal(overview.sections.CARGAS.empty_km_avoided.value,35);
  assert.equal(overview.module_health.find(x=>x.module==='CARGAS').status,'HEALTHY');
});

test('heartbeat degrada Cargas cuando deja de recibir eventos',()=>{
  let now=new Date('2026-08-16T10:00:00Z');
  const control=createControlService({store:new MemoryControlStore()});
  const ingest=createCargasIngestionService({controlService:control,now:()=>now,staleAfterMinutes:30});
  ingest.ingest({events:[{id:'E1',type:'INTAKE_CLASSIFIED',load_id:'L1',created_at:'2026-08-16T10:00:00Z'}]});
  now=new Date('2026-08-16T10:45:00Z');
  const health=ingest.heartbeat();
  assert.equal(health.status,'DEGRADED');
  assert.match(health.detail,/45 min/);
});
