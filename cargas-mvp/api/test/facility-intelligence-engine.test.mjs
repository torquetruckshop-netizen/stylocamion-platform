import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFacilityProfile,estimateDwellCost} from '../src/facility-intelligence-engine.mjs';

test('perfil de instalación calcula rating espera y riesgo',()=>{
 const reviews=Array.from({length:6},(_,i)=>({facility_id:'FAC-1',rating:i<2?2:4,wait_minutes:[60,90,120,140,180,220][i],amenities:['BAÑO','PLAYA']}));
 const p=buildFacilityProfile(reviews);
 assert.equal(p.facility_id,'FAC-1');
 assert.equal(p.review_count,6);
 assert.equal(p.confidence,'MEDIUM');
 assert.equal(p.risk,'YELLOW');
 assert.ok(p.median_wait_minutes>=120);
});

test('costo de espera usa mediana y minutos libres',()=>{
 const p=buildFacilityProfile(Array.from({length:5},()=>({facility_id:'F',rating:4,wait_minutes:120})));
 const c=estimateDwellCost({profile:p,truckHourlyCost:30000,freeMinutes:60});
 assert.equal(c.billable_wait_minutes,60);
 assert.equal(c.estimated_dwell_cost,30000);
});
