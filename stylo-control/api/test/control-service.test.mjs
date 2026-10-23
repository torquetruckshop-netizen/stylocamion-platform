import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryControlStore } from '../src/control-store.mjs';
import { createControlService } from '../src/control-service.mjs';
import { investorMetricKeys } from '../src/metric-catalog.mjs';

function seedFacts(){
  return [
    {module:'PLATFORM',event_type:'USER_REGISTERED',entity_type:'USER',entity_id:'U1',status:'ACTIVE',occurred_at:'2026-08-01T10:00:00Z',dimensions:{country:'AR',phone:'+549000'}},
    {module:'PLATFORM',event_type:'USER_REGISTERED',entity_type:'USER',entity_id:'U2',status:'ACTIVE',occurred_at:'2026-08-02T10:00:00Z'},
    {module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L1',channel:'WHATSAPP',occurred_at:'2026-08-03T10:00:00Z'},
    {module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L2',channel:'WEB',occurred_at:'2026-08-03T11:00:00Z'},
    {module:'CARGAS',event_type:'LOAD_MATCHED',entity_type:'LOAD',entity_id:'L1',occurred_at:'2026-08-03T12:00:00Z'},
    {module:'CARGAS',event_type:'EMPTY_KM_AVOIDED',entity_type:'LOAD',entity_id:'L1',value:82.5,occurred_at:'2026-08-03T13:00:00Z'},
    {module:'REVENUE',event_type:'GMV_RECORDED',entity_type:'OPERATION',entity_id:'O1',value:900000,currency:'ARS',occurred_at:'2026-08-04T10:00:00Z'},
    {module:'REVENUE',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'P1',value:27000,currency:'ARS',occurred_at:'2026-08-04T10:05:00Z'},
    {module:'AI',event_type:'AI_DECISION',entity_type:'LOAD',entity_id:'L1',occurred_at:'2026-08-04T11:00:00Z'}
  ];
}

test('admin overview agrega métricas y salud de módulos',()=>{
  const store=new MemoryControlStore({facts:seedFacts(),health:[{module:'CARGAS',status:'HEALTHY',latency_ms:120}]});
  const service=createControlService({store});
  const result=service.adminOverview({role:'ADMIN'});
  assert.equal(result.sections.USERS.users_total.value,2);
  assert.equal(result.sections.CARGAS.loads_detected.value,2);
  assert.equal(result.sections.CARGAS.loads_from_whatsapp.value,1);
  assert.equal(result.sections.CARGAS.empty_km_avoided.value,82.5);
  assert.equal(result.sections.REVENUE.gross_revenue.value,27000);
  assert.equal(result.module_health[0].module,'CARGAS');
});

test('Investor View contiene sólo métricas permitidas y no salud interna',()=>{
  const store=new MemoryControlStore({facts:seedFacts(),health:[{module:'CARGAS',status:'DEGRADED',detail:'token vencido'}]});
  const service=createControlService({store});
  const result=service.investorSnapshot({role:'INVESTOR'});
  const returnedKeys=Object.keys(result.metrics).sort();
  assert.deepEqual(returnedKeys,[...investorMetricKeys()].sort());
  assert.equal('gross_revenue' in result.metrics,false);
  assert.equal('loads_from_whatsapp' in result.metrics,false);
  assert.equal('module_health' in result,false);
  assert.equal(result.privacy,'AGGREGATED_ONLY');
});

test('dimensiones sensibles se descartan al registrar hechos',()=>{
  const store=new MemoryControlStore();
  const service=createControlService({store});
  const fact=service.recordFact({role:'ADMIN',fact:{
    module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L1',occurred_at:'2026-08-01T00:00:00Z',
    dimensions:{phone:'+54911',email:'x@example.com',plate:'AA000AA',route:'Rosario-Parana'}
  }});
  assert.equal(fact.dimensions.phone,undefined);
  assert.equal(fact.dimensions.email,undefined);
  assert.equal(fact.dimensions.plate,undefined);
  assert.equal(fact.dimensions.route,'Rosario-Parana');
});

test('inversor no puede escribir hechos ni pedir Admin View',()=>{
  const service=createControlService({store:new MemoryControlStore()});
  assert.throws(()=>service.adminOverview({role:'INVESTOR'}),/Acceso no autorizado/);
  assert.throws(()=>service.recordFact({role:'INVESTOR',fact:{module:'AI',event_type:'AI_DECISION'}}),/Acceso no autorizado/);
});

test('rango temporal limita métricas',()=>{
  const service=createControlService({store:new MemoryControlStore({facts:seedFacts()})});
  const result=service.investorSnapshot({role:'INVESTOR',range:{start:'2026-08-03T00:00:00Z',end:'2026-08-03T23:59:59Z'}});
  assert.equal(result.metrics.loads_detected.value,2);
  assert.equal(result.metrics.users_total.value,0);
});

test('un source_event_id repetido no duplica ingresos ni hechos',()=>{
  const store=new MemoryControlStore();
  const service=createControlService({store});
  const fact={
    module:'REVENUE',source_event_id:'mp-payment-123',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'P123',value:35000,currency:'ARS',occurred_at:'2026-08-05T12:00:00Z'
  };
  service.recordFact({role:'ADMIN',fact});
  service.recordFact({role:'ADMIN',fact});
  assert.equal(store.listFacts().length,1);
  assert.equal(service.adminOverview({role:'ADMIN'}).sections.REVENUE.gross_revenue.value,35000);
});
