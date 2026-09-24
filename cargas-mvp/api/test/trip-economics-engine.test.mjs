import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFuel,
  calculateTolls,
  calculateTripEconomics,
  resolveFuelConsumption
} from '../src/trip-economics-engine.mjs';
import { createTripEconomicsService } from '../src/trip-economics-service.mjs';

test('30 L/100 km calcula correctamente litros incluyendo km vacíos', () => {
  const result = calculateFuel({ loadedKm:500, emptyKm:50, consumptionLPer100Km:30 });
  assert.equal(result.total_km,550);
  assert.equal(result.estimated_liters,165);
});

test('consumo específico del vehículo prevalece sobre empresa y default Stylo', () => {
  assert.deepEqual(
    resolveFuelConsumption({
      vehicle:{fuel_consumption_l_per_100km:34},
      organization:{default_fuel_consumption_l_per_100km:31}
    }),
    {value:34,source:'VEHICLE'}
  );
  assert.deepEqual(
    resolveFuelConsumption({organization:{default_fuel_consumption_l_per_100km:31}}),
    {value:31,source:'ORGANIZATION'}
  );
  assert.deepEqual(resolveFuelConsumption({}),{value:30,source:'STYLO_DEFAULT'});
});

test('peajes confirmados se suman sin usar promedio', () => {
  const result = calculateTolls({
    tolls:[
      {name:'Peaje A',amount:7500,confirmed:true},
      {name:'Peaje B',amount:8500,confirmed:true}
    ],
    estimatedTollCount:2,
    averageTollAmount:10000
  });
  assert.equal(result.toll_cost,16000);
  assert.equal(result.toll_confidence,'CONFIRMED');
  assert.equal(result.estimated_toll_count,0);
});

test('peajes parciales usan promedio sólo para estaciones sin tarifa', () => {
  const result = calculateTolls({
    tolls:[{name:'Peaje identificado',amount:9000,confirmed:true}],
    estimatedTollCount:3,
    averageTollAmount:10000
  });
  assert.equal(result.toll_count,3);
  assert.equal(result.confirmed_toll_count,1);
  assert.equal(result.estimated_toll_count,2);
  assert.equal(result.toll_cost,29000);
  assert.equal(result.toll_confidence,'MIXED');
});

test('calcula costo variable y resultado preliminar del flete', () => {
  const result = calculateTripEconomics({
    loadedKm:500,
    emptyKm:50,
    consumptionLPer100Km:30,
    fuelPricePerLiter:1500,
    estimatedTollCount:3,
    averageTollAmount:10000,
    freightAmount:1000000,
    currency:'ARS'
  });
  assert.equal(result.estimated_liters,165);
  assert.equal(result.fuel_cost,247500);
  assert.equal(result.toll_cost,30000);
  assert.equal(result.variable_cost,277500);
  assert.equal(result.variable_cost_per_km,504.55);
  assert.equal(result.preliminary_contribution,722500);
  assert.equal(result.preliminary_contribution_percent,72.25);
  assert.equal(result.estimate_confidence,'ESTIMATED');
});

test('servicio guarda snapshot con fuente de consumo', async () => {
  const saved=[];
  const estimate=createTripEconomicsService({saveEstimate:async x=>saved.push(x)});
  const result=await estimate({
    load:{id:'SC-ECO-1',price_amount:800000,price_currency:'ARS'},
    vehicle:{id:'VEH-1',fuel_consumption_l_per_100km:32},
    organization:{id:'ORG-1',default_fuel_price_per_liter:1400,default_toll_average_amount:8000},
    loadedKm:400,
    emptyKm:25,
    estimatedTollCount:2
  });
  assert.equal(result.consumption_source,'VEHICLE');
  assert.equal(result.estimated_liters,136);
  assert.equal(result.toll_cost,16000);
  assert.equal(saved.length,1);
  assert.equal(saved[0].calculation_version,'trip-economics-v2');
});
