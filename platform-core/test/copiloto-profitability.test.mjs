import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTrip,
  analyzeRoundTrip,
  minimumPriceForTargetMargin,
} from '../src/copiloto-profitability.mjs';

test('analiza un viaje y clasifica un margen saludable', () => {
  const result = analyzeTrip({
    offeredAmount: 1_450_000,
    loadedKm: 500,
    emptyKm: 100,
    fuelPricePerLiter: 1_500,
    kmPerLiter: 2.5,
    tolls: 80_000,
    driverCost: 120_000,
    otherTripCosts: 50_000,
    fixedCostPerKm: 700,
  });

  assert.equal(result.totalKm, 600);
  assert.equal(result.costs.fuel, 360_000);
  assert.equal(result.costs.total, 1_030_000);
  assert.equal(result.contribution, 420_000);
  assert.equal(result.verdict, 'CONVIENE');
});

test('penaliza kilómetros vacíos al calcular rentabilidad', () => {
  const base = {
    offeredAmount: 1_000_000,
    loadedKm: 500,
    fuelPricePerLiter: 1_500,
    kmPerLiter: 2.5,
    fixedCostPerKm: 700,
  };
  const withoutEmpty = analyzeTrip({ ...base, emptyKm: 0 });
  const withEmpty = analyzeTrip({ ...base, emptyKm: 500 });

  assert.ok(withEmpty.marginPercent < withoutEmpty.marginPercent);
  assert.ok(withEmpty.costs.total > withoutEmpty.costs.total);
});

test('combina ida y regreso para mostrar la economía real del circuito', () => {
  const result = analyzeRoundTrip({
    shared: { fuelPricePerLiter: 1_500, kmPerLiter: 2.5, fixedCostPerKm: 500 },
    outbound: { offeredAmount: 1_200_000, loadedKm: 500 },
    returnTrip: { offeredAmount: 900_000, loadedKm: 500 },
  });

  assert.equal(result.warning, null);
  assert.equal(result.combined.offeredAmount, 2_100_000);
  assert.equal(result.combined.totalKm, 1_000);
  assert.equal(result.combined.totalCost, 1_100_000);
  assert.equal(result.combined.contribution, 1_000_000);
});

test('calcula precio mínimo para margen objetivo', () => {
  assert.equal(minimumPriceForTargetMargin({ totalCost: 1_000_000, targetMarginPercent: 20 }), 1_250_000);
});

test('rechaza consumos inválidos para no producir recomendaciones engañosas', () => {
  assert.throws(() => analyzeTrip({
    offeredAmount: 1_000_000,
    loadedKm: 500,
    fuelPricePerLiter: 1_500,
    kmPerLiter: 0,
  }), /CONSUMPTION_INVALID/);
});
