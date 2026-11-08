import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryControlStore} from '../src/control-store.mjs';
import {createControlService} from '../src/control-service.mjs';

test('atribución rankea ingresos por origen',()=>{
 const facts=[
  {module:'AUDIENCE',event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:'s1',source_event_id:'1',dimensions:{source:'INSTAGRAM'},occurred_at:'2026-08-16T10:00:00Z'},
  {module:'AUDIENCE',event_type:'WEB_SESSION',entity_type:'SESSION',entity_id:'s2',source_event_id:'2',dimensions:{source:'NOTICIAS'},occurred_at:'2026-08-16T10:01:00Z'},
  {module:'VENTAS',event_type:'SALES_INQUIRY',entity_type:'INQUIRY',entity_id:'i1',source_event_id:'3',dimensions:{source:'INSTAGRAM'},occurred_at:'2026-08-16T10:02:00Z'},
  {module:'REVENUE',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:'p1',source_event_id:'4',dimensions:{source:'INSTAGRAM'},occurred_at:'2026-08-16T10:03:00Z'},
  {module:'REVENUE',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'p1',source_event_id:'5',value:100000,dimensions:{source:'INSTAGRAM'},occurred_at:'2026-08-16T10:03:00Z'},
  {module:'REVENUE',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:'p2',source_event_id:'6',dimensions:{source:'NOTICIAS'},occurred_at:'2026-08-16T10:04:00Z'},
  {module:'REVENUE',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'p2',source_event_id:'7',value:50000,dimensions:{source:'NOTICIAS'},occurred_at:'2026-08-16T10:04:00Z'}
 ];
 const service=createControlService({store:new MemoryControlStore({facts})});
 const report=service.attribution({role:'ADMIN',groupBy:'source'});
 assert.equal(report.rows[0].key,'INSTAGRAM');
 assert.equal(report.rows[0].revenue,100000);
 assert.equal(report.rows[0].revenue_share_percent,66.67);
 assert.equal(report.rows[0].payment_conversion_percent,100);
});
