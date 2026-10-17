import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryControlStore } from '../src/control-store.mjs';
import { createControlService } from '../src/control-service.mjs';

const facts=[
 {module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L1',occurred_at:'2026-08-15T05:00:00Z'},
 {module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L2',occurred_at:'2026-08-16T02:00:00Z'},
 {module:'CARGAS',event_type:'LOAD_DETECTED',entity_type:'LOAD',entity_id:'L3',occurred_at:'2026-08-16T03:00:00Z'},
 {module:'REVENUE',event_type:'REVENUE_RECORDED',entity_type:'PAYMENT',entity_id:'P1',value:50000,currency:'ARS',occurred_at:'2026-08-16T04:00:00Z'}
];

test('comparación diaria usa hoy contra el mismo tramo horario de ayer',()=>{
 const service=createControlService({store:new MemoryControlStore({facts})});
 const result=service.trends({role:'ADMIN',period:'DAY',now:new Date('2026-08-16T07:00:00Z'),days:2});
 assert.equal(result.comparison.metrics.loads_detected.current_value,2);
 assert.equal(result.comparison.metrics.loads_detected.previous_value,1);
 assert.equal(result.comparison.metrics.loads_detected.change_percent,100);
 assert.equal(result.daily_series.length,2);
});

test('tendencias de inversor siguen excluyendo ingresos internos',()=>{
 const service=createControlService({store:new MemoryControlStore({facts})});
 const result=service.trends({role:'INVESTOR',period:'WEEK',now:new Date('2026-08-16T07:00:00Z'),investor:true});
 assert.equal(result.view,'INVESTOR');
 assert.equal(result.privacy,'AGGREGATED_ONLY');
 assert.equal('gross_revenue' in result.comparison.metrics,false);
 for (const day of result.daily_series) assert.equal('gross_revenue' in day.metrics,false);
});
