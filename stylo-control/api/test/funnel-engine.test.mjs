import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryControlStore} from '../src/control-store.mjs';
import {createControlService} from '../src/control-service.mjs';

function add(service,fact){service.recordFact({role:'ADMIN',fact});}

test('embudo global calcula tasas de visita a pago e ingreso por visita',()=>{
 const service=createControlService({store:new MemoryControlStore()});
 for(let i=1;i<=10;i++) add(service,{module:'AUDIENCE',source_event_id:`s${i}`,event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:`s${i}`,occurred_at:'2026-08-16T10:00:00Z',dimensions:{source:'INSTAGRAM'}});
 for(let i=1;i<=4;i++) add(service,{module:'AUDIENCE',source_event_id:`a${i}`,event_type:'COMMERCIAL_ACTION',entity_type:'SESSION',entity_id:`s${i}`,occurred_at:'2026-08-16T10:05:00Z',dimensions:{source:'INSTAGRAM'}});
 for(let i=1;i<=3;i++) add(service,{module:'VENTAS',source_event_id:`q${i}`,event_type:'SALES_INQUIRY',entity_type:'INQUIRY',entity_id:`q${i}`,occurred_at:'2026-08-16T10:10:00Z',dimensions:{source:'INSTAGRAM'}});
 for(let i=1;i<=2;i++) add(service,{module:'VENTAS',source_event_id:`p${i}`,event_type:'SALES_SERVICE_PURCHASED',entity_type:'PURCHASE',entity_id:`p${i}`,occurred_at:'2026-08-16T10:15:00Z',dimensions:{source:'INSTAGRAM'}});
 add(service,{module:'REVENUE',source_event_id:'pay1',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:'pay1',occurred_at:'2026-08-16T10:20:00Z',dimensions:{source:'INSTAGRAM'}});
 add(service,{module:'REVENUE',source_event_id:'rev1',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'pay1',value:100000,occurred_at:'2026-08-16T10:20:00Z',dimensions:{source:'INSTAGRAM'}});
 const f=service.funnel({role:'ADMIN',groupBy:'source'});
 assert.equal(f.global.visits,10);
 assert.equal(f.global.payments_confirmed,1);
 assert.equal(f.global.visit_to_payment_rate,10);
 assert.equal(f.global.revenue_per_visit,10000);
 assert.equal(f.groups[0].key,'INSTAGRAM');
});

test('embudo agrupa por módulo de origen',()=>{
 const service=createControlService({store:new MemoryControlStore()});
 add(service,{module:'AUDIENCE',source_event_id:'1',event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:'s1',dimensions:{module_name:'VENTAS'}});
 add(service,{module:'AUDIENCE',source_event_id:'2',event_type:'MODULE_VIEW',entity_type:'SESSION',entity_id:'s1',dimensions:{module_name:'VENTAS'}});
 add(service,{module:'AUDIENCE',source_event_id:'3',event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:'s2',dimensions:{module_name:'CARGAS'}});
 const f=service.funnel({role:'ADMIN',groupBy:'module'});
 const ventas=f.groups.find(x=>x.key==='VENTAS');
 const cargas=f.groups.find(x=>x.key==='CARGAS');
 assert.equal(ventas.visits,1);assert.equal(ventas.module_views,1);assert.equal(cargas.visits,1);
});
