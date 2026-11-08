import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeIdle} from '../src/idle-intelligence-engine.mjs';
import {detectFuelAnomalies,compareFuelTransactionToTelemetry} from '../src/fuel-anomaly-engine.mjs';
import {evaluateMaintenanceRisk} from '../src/maintenance-risk-engine.mjs';
import {buildDriverEfficiencyScore} from '../src/driver-efficiency-engine.mjs';
import {answerFleetQuestion} from '../src/fleet-conversational-analytics.mjs';
import {resolveFutureAvailability,shouldPreSearch} from '../src/future-availability-engine.mjs';

test('ralentí calcula costo evitable',()=>{const r=analyzeIdle({engineOnMinutes:600,movingMinutes:450,productiveIdleMinutes:30,idlingFuelUsedL:20,fuelPricePerLiter:1500});assert.equal(r.avoidable_idle_minutes,120);assert.ok(r.avoidable_idle_cost>0);});

test('caída de tanque sin recorrido genera alerta',()=>{const r=detectFuelAnomalies([{observed_at:'2026-08-16T10:00:00Z',fuel_level_percent:80,odometer_km:1000},{observed_at:'2026-08-16T10:30:00Z',fuel_level_percent:55,odometer_km:1001}]);assert.equal(r.status,'CRITICAL');assert.equal(r.anomalies[0].type,'SUDDEN_FUEL_DROP');});

test('transacción incompatible con telemetría queda mismatch',()=>{const r=compareFuelTransactionToTelemetry({transactionLiters:200,tankCapacityLiters:600,beforePercent:30,afterPercent:45});assert.equal(r.status,'MISMATCH');});

test('service vencido pide acción',()=>{const r=evaluateMaintenanceRisk({odometerKm:120000,serviceRules:[{id:'OIL',last_service_odometer_km:100000,interval_km:15000}]});assert.equal(r.status,'ACTION_REQUIRED');});

test('score de conducción penaliza ralentí y excesos sin usar datos físicos personales',()=>{const r=buildDriverEfficiencyScore({avoidable_idle_percent:20,harsh_events_per_100km:4,overspeed_minutes_percent:10,fuel_efficiency_vs_baseline_percent:8});assert.ok(r.efficiency_score<90);assert.ok(r.recommendations.length>0);});

test('consulta natural rankea consumos',()=>{const r=answerFleetQuestion({question:'qué camiones consumieron más',vehicles:[{id:'A',consumption_l_per_100km:28},{id:'B',consumption_l_per_100km:35}]});assert.equal(r.rows[0].vehicle_id,'B');});

test('próxima búsqueda usa destino futuro y ventana de dos horas',()=>{const a=resolveFutureAvailability({id:'V1'},{destination:'Rosario',expected_unload_at:'2026-08-16T14:00:00Z'},new Date('2026-08-16T12:00:00Z'));assert.equal(a.source,'EXPECTED_UNLOAD');assert.equal(shouldPreSearch({availableAt:a.available_at,now:new Date('2026-08-16T12:00:00Z')}),true);});
