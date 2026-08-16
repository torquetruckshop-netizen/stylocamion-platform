import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTelematicsReading,
  inferCapabilities,
  calculateActualTripMetrics,
  compareEstimatedVsActual,
  TelematicsCapability
} from '../src/telematics-engine.mjs';

test('normaliza una lectura y detecta capacidades disponibles', () => {
  const reading = normalizeTelematicsReading({
    provider:'GEOTAB',
    vehicle_id:'VEH-1',
    observed_at:'2026-08-15T10:00:00-03:00',
    position:{lat:-31.74,lon:-60.52},
    odometer_km:10000,
    total_fuel_used_l:5000,
    fuel_level_percent:67,
    idling_fuel_used_l:410,
    source_quality:'HIGH'
  });

  const caps = inferCapabilities(reading);
  assert.ok(caps.includes(TelematicsCapability.GPS));
  assert.ok(caps.includes(TelematicsCapability.ODOMETER));
  assert.ok(caps.includes(TelematicsCapability.TOTAL_FUEL_USED));
  assert.ok(caps.includes(TelematicsCapability.FUEL_LEVEL));
  assert.ok(caps.includes(TelematicsCapability.IDLING_FUEL_USED));
});

test('calcula consumo real de 30 L/100 km desde contadores ECU', () => {
  const actual = calculateActualTripMetrics({
    start:{
      provider:'SAMSARA',
      vehicle_id:'VEH-1',
      observed_at:'2026-08-15T08:00:00-03:00',
      odometer_km:10000,
      total_fuel_used_l:5000,
      idling_fuel_used_l:400,
      source_quality:'HIGH'
    },
    end:{
      provider:'SAMSARA',
      vehicle_id:'VEH-1',
      observed_at:'2026-08-15T18:00:00-03:00',
      odometer_km:10450,
      total_fuel_used_l:5135,
      idling_fuel_used_l:405,
      source_quality:'HIGH'
    },
    actualFuelPricePerLiter:1500,
    currency:'ARS',
    fuelCostSource:'ACTUAL_PURCHASE_PRICE'
  });

  assert.equal(actual.status,'MEASURED');
  assert.equal(actual.distance_km,450);
  assert.equal(actual.fuel_used_l,135);
  assert.equal(actual.idling_fuel_used_l,5);
  assert.equal(actual.consumption_l_100km,30);
  assert.equal(actual.fuel_cost_amount,202500);
  assert.equal(actual.confidence,'HIGH');
});

test('sin combustible acumulado conserva dato parcial y no inventa consumo real', () => {
  const actual = calculateActualTripMetrics({
    start:{ provider:'LOCAL', observed_at:'2026-08-15T08:00:00Z', odometer_km:1000, fuel_level_percent:80 },
    end:{ provider:'LOCAL', observed_at:'2026-08-15T12:00:00Z', odometer_km:1200, fuel_level_percent:45 }
  });

  assert.equal(actual.status,'PARTIAL');
  assert.equal(actual.distance_km,200);
  assert.equal(actual.fuel_used_l,null);
  assert.equal(actual.consumption_l_100km,null);
  assert.ok(actual.reasons.includes('TOTAL_FUEL_USED_UNAVAILABLE'));
});

test('detecta reset de contador y no produce un consumo falso', () => {
  const actual = calculateActualTripMetrics({
    start:{ provider:'OEM', observed_at:'2026-08-15T08:00:00Z', odometer_km:5000, total_fuel_used_l:9000 },
    end:{ provider:'OEM', observed_at:'2026-08-15T12:00:00Z', odometer_km:5200, total_fuel_used_l:100 }
  });

  assert.equal(actual.fuel_used_l,null);
  assert.ok(actual.reasons.includes('FUEL_COUNTER_RESET_OR_INVALID'));
});

test('compara consumo estimado contra consumo real', () => {
  const comparison = compareEstimatedVsActual({
    estimated:{ fuel_liters:150, fuel_cost:225000 },
    actual:{ fuel_used_l:135, fuel_cost_amount:202500 }
  });

  assert.equal(comparison.fuel_liters_variance,-15);
  assert.equal(comparison.fuel_liters_variance_percent,-10);
  assert.equal(comparison.fuel_cost_variance,-22500);
  assert.equal(comparison.fuel_cost_variance_percent,-10);
});
