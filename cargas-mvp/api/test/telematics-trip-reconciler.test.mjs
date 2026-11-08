import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelematicsTripReconciler } from '../src/telematics-trip-reconciler.mjs';

const start = {
  provider:'TEST',
  vehicle_id:'VEH-1',
  observed_at:'2026-08-16T08:00:00Z',
  odometer_km:10000,
  total_fuel_used_l:5000,
  idling_fuel_used_l:100,
  source_quality:'HIGH'
};

const end = {
  provider:'TEST',
  vehicle_id:'VEH-1',
  observed_at:'2026-08-16T16:00:00Z',
  odometer_km:10450,
  total_fuel_used_l:5135,
  idling_fuel_used_l:108,
  source_quality:'HIGH'
};

test('reconcilia estimado contra consumo real y refresca perfil', async () => {
  const saved=[];
  const refreshed=[];
  const reconcile = createTelematicsTripReconciler({
    findBoundaryReading:async ({direction}) => direction === 'NEAREST_BEFORE' ? start : end,
    getLatestEstimate:async () => ({ id:'EST-1', estimated_liters:150, fuel_cost:225000 }),
    saveTripActual:async record => { saved.push(record); return {...record,id:'ACT-1'}; },
    refreshFuelProfile:async ({vehicleId}) => {
      refreshed.push(vehicleId);
      return { vehicle_id:vehicleId, ready_for_estimation:true, consumption_l_per_100km:30 };
    }
  });

  const result = await reconcile({
    load:{id:'SC-1'},
    vehicle:{id:'VEH-1'},
    startedAt:'2026-08-16T08:00:00Z',
    endedAt:'2026-08-16T16:00:00Z',
    actualFuelPricePerLiter:1500
  });

  assert.equal(result.status,'RECONCILED');
  assert.equal(result.actual.distance_km,450);
  assert.equal(result.actual.fuel_used_l,135);
  assert.equal(result.actual.consumption_l_100km,30);
  assert.equal(result.actual.fuel_cost_amount,202500);
  assert.equal(result.variance.fuel_liters_variance,-15);
  assert.equal(result.variance.fuel_liters_variance_percent,-10);
  assert.equal(result.variance.fuel_cost_variance,-22500);
  assert.deepEqual(refreshed,['VEH-1']);
  assert.equal(saved.length,1);
});

test('si faltan lecturas no inventa consumo y queda esperando telemetría', async () => {
  const reconcile = createTelematicsTripReconciler({
    findBoundaryReading:async ({direction}) => direction === 'NEAREST_BEFORE' ? start : null
  });
  const result = await reconcile({
    load:{id:'SC-2'},
    vehicle:{id:'VEH-1'},
    startedAt:'2026-08-16T08:00:00Z',
    endedAt:'2026-08-16T16:00:00Z'
  });
  assert.equal(result.status,'WAITING_TELEMATICS');
  assert.equal(result.missing_end_reading,true);
  assert.equal(result.actual,null);
});
