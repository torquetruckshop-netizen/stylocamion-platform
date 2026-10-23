import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVehicleFuelProfile, resolveAdaptiveFuelConsumption } from '../src/vehicle-efficiency-profile.mjs';
import { createTripEconomicsService } from '../src/trip-economics-service.mjs';

function actual(consumption, distance = 400, day = 1, confidence = 'HIGH') {
  return {
    status:'MEASURED',
    confidence,
    started_at:`2026-08-${String(day).padStart(2,'0')}T08:00:00Z`,
    ended_at:`2026-08-${String(day).padStart(2,'0')}T16:00:00Z`,
    distance_km:distance,
    consumption_l_100km:consumption
  };
}

test('un solo viaje no reemplaza el consumo configurado', () => {
  const profile = buildVehicleFuelProfile([actual(27.5)]);
  assert.equal(profile.ready_for_estimation,false);
  const resolved = resolveAdaptiveFuelConsumption({
    profile,
    vehicle:{ fuel_consumption_l_per_100km:31 }
  });
  assert.equal(resolved.source,'VEHICLE');
  assert.equal(resolved.value,31);
});

test('descarta lecturas anómalas y aprende con viajes válidos', () => {
  const profile = buildVehicleFuelProfile([
    actual(29,500,1),
    actual(30,450,2),
    actual(31,550,3),
    actual(180,500,4),
    actual(5,500,5)
  ]);
  assert.equal(profile.ready_for_estimation,true);
  assert.equal(profile.sample_count,3);
  assert.equal(profile.rejected_sample_count,2);
  assert.ok(profile.consumption_l_per_100km >= 29 && profile.consumption_l_per_100km <= 31);
  assert.equal(profile.confidence,'MEDIUM');
});

test('cinco viajes consistentes generan perfil de alta confianza', () => {
  const profile = buildVehicleFuelProfile([
    actual(28.5,400,1),
    actual(29,420,2),
    actual(28.8,450,3),
    actual(29.2,410,4),
    actual(28.9,430,5)
  ]);
  assert.equal(profile.ready_for_estimation,true);
  assert.equal(profile.sample_count,5);
  assert.equal(profile.confidence,'HIGH');
  assert.ok(profile.total_distance_km >= 2000);
});

test('economía del viaje usa perfil telemétrico confiable antes del default', async () => {
  const profile = buildVehicleFuelProfile([
    actual(28,400,1),
    actual(28,400,2),
    actual(28,400,3),
    actual(28,400,4),
    actual(28,400,5)
  ]);
  const estimateTrip = createTripEconomicsService();
  const estimate = await estimateTrip({
    load:{ id:'SC-FUEL-1', price_currency:'ARS' },
    vehicle:{ id:'VEH-1' },
    fuelProfile:profile,
    loadedKm:500,
    emptyKm:0,
    fuelPricePerLiter:1500
  });
  assert.equal(estimate.consumption_source,'TELEMATICS_PROFILE');
  assert.equal(estimate.consumption_l_per_100km,28);
  assert.equal(estimate.estimated_liters,140);
  assert.equal(estimate.fuel_cost,210000);
  assert.equal(estimate.calculation_version,'trip-economics-v2');
});
