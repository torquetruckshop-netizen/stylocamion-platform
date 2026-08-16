import test from 'node:test';
import assert from 'node:assert/strict';
import {detectMetricAnomalies} from '../src/anomaly-detection-engine.mjs';

function payment(id,at){return{module:'REVENUE',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:id,occurred_at:at};}

test('detecta caída crítica de pagos contra período anterior',()=>{
 const facts=[];
 for(let i=0;i<10;i++) facts.push(payment(`prev-${i}`,`2026-08-13T${String(i+13).padStart(2,'0')}:00:00Z`));
 facts.push(payment('now-1','2026-08-14T13:00:00Z'));
 const r=detectMetricAnomalies({facts,period:'DAY',now:new Date('2026-08-15T12:00:00Z')});
 const a=r.anomalies.find(x=>x.metric_key==='payments_confirmed');
 assert.ok(a);
 assert.equal(a.direction,'DROP');
 assert.equal(a.severity,'CRITICAL');
 assert.equal(a.action,'INVESTIGATE_NOW');
});

test('sin variaciones fuertes queda normal',()=>{
 const facts=[payment('a','2026-08-13T15:00:00Z'),payment('b','2026-08-14T15:00:00Z')];
 const r=detectMetricAnomalies({facts,period:'DAY',now:new Date('2026-08-15T12:00:00Z')});
 assert.equal(r.status,'NORMAL');
});
