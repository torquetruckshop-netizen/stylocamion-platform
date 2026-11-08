import test from 'node:test';
import assert from 'node:assert/strict';
import {predictEta,detectTripExceptions,nextOperatorAction} from '../src/eta-exception-engine.mjs';

test('predice ETA incorporando demoras conocidas',()=>{
 const r=predictEta({remainingKm:130,averageSpeedKph:65,currentTime:new Date('2026-08-16T12:00:00Z'),trafficDelayMinutes:30,facilityDelayMinutes:30,signalQuality:'HIGH'});
 assert.equal(r.status,'PREDICTED');
 assert.equal(r.drive_minutes,120);
 assert.equal(r.delay_minutes,60);
 assert.equal(r.eta,'2026-08-16T15:00:00.000Z');
});

test('demora fuerte y permanencia excesiva generan excepción crítica',()=>{
 const eta={eta:'2026-08-16T18:00:00Z'};
 const x=detectTripExceptions({predictedEta:eta,plannedArrivalAt:'2026-08-16T15:00:00Z',currentDwellMinutes:200});
 assert.equal(x.priority,'CRITICAL');
 assert.equal(nextOperatorAction(x),'CONTACT_AND_RESOLVE_NOW');
 assert.ok(x.exceptions.some(e=>e.type==='ETA_DELAY_CRITICAL'));
});
