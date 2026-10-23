import test from 'node:test';
import assert from 'node:assert/strict';
import {buildShipmentDigitalTwin,deriveShipmentTwinEvent} from '../src/shipment-digital-twin.mjs';
import {buildAnonymousFleetBenchmark,compareFleetToBenchmark,estimateEmissions} from '../src/fleet-benchmark-engine.mjs';

test('Digital Twin concentra estado costo ETA compliance y excepciones',()=>{const twin=buildShipmentDigitalTwin({load:{id:'L1',status:'EN_TRANSITO',origin:'Rosario',destination:'Parana',cargo_type:'general',weight_tn:20},vehicle:{id:'V1',availability:'BUSY'},documents:{status:'CLEAR'},economics:{variable_cost:100000},eta:{status:'PREDICTED',eta:'2026-08-16T18:00:00Z'},exceptions:[{type:'ETA_DELAY',severity:'WARNING',status:'OPEN'}]});assert.equal(twin.health,'ATTENTION');assert.equal(twin.exceptions.length,1);});

test('Digital Twin detecta cambios relevantes',()=>{const a=buildShipmentDigitalTwin({load:{id:'L',status:'EN_TRANSITO'},eta:{status:'PREDICTED',eta:'2026-08-16T18:00:00Z'},now:new Date('2026-08-16T12:00:00Z')});const b=buildShipmentDigitalTwin({load:{id:'L',status:'ENTREGADA'},eta:{status:'PREDICTED',eta:'2026-08-16T18:00:00Z'},now:new Date('2026-08-16T13:00:00Z')});const e=deriveShipmentTwinEvent(a,b);assert.equal(e.type,'TWIN_UPDATED');assert.ok(e.changes.includes('operational_state'));});

test('benchmark exige cohorte mínima y no identifica pares',()=>{const insufficient=buildAnonymousFleetBenchmark({records:[{fuel:30}],metric:'fuel',minCohortSize:5});assert.equal(insufficient.status,'INSUFFICIENT_COHORT');const b=buildAnonymousFleetBenchmark({records:[{fuel:25},{fuel:27},{fuel:30},{fuel:32},{fuel:35}],metric:'fuel',minCohortSize:5});assert.equal(b.status,'READY');assert.equal(b.privacy,'AGGREGATED_ONLY');const c=compareFleetToBenchmark({fleetValue:25,benchmark:b,lowerIsBetter:true});assert.equal(c.position,'TOP_QUARTILE');});

test('emisiones requieren factor explícito y no inventan factor',()=>{assert.equal(estimateEmissions({fuelLiters:100}).status,'REQUIRES_FACTOR');const e=estimateEmissions({fuelLiters:100,emissionFactorKgPerLiter:2.5});assert.equal(e.co2e_kg,250);});
