import { calculateTripEconomics, resolveFuelConsumption } from './trip-economics-engine.mjs';

export const TRIP_ECONOMICS_VERSION = 'trip-economics-v1';

export function createTripEconomicsService({ saveEstimate = null } = {}) {
  return async function estimateTrip({
    load,
    vehicle = {},
    organization = {},
    loadedKm = 0,
    emptyKm = 0,
    fuelPricePerLiter = null,
    tolls = [],
    estimatedTollCount = 0,
    averageTollAmount = null,
    freightAmount = null,
    currency = null
  } = {}) {
    if (!load) throw new Error('load es obligatorio');

    const consumption = resolveFuelConsumption({ vehicle, organization });
    const resolvedFuelPrice = fuelPricePerLiter ?? organization.default_fuel_price_per_liter ?? null;
    const resolvedAverageToll = averageTollAmount ?? organization.default_toll_average_amount ?? 0;
    const resolvedCurrency = currency || organization.default_cost_currency || load.price_currency || 'ARS';
    const resolvedFreight = freightAmount ?? load.price_amount ?? null;

    const economics = calculateTripEconomics({
      loadedKm,
      emptyKm,
      consumptionLPer100Km:consumption.value,
      fuelPricePerLiter:resolvedFuelPrice,
      tolls,
      estimatedTollCount,
      averageTollAmount:resolvedAverageToll,
      freightAmount:resolvedFreight,
      currency:resolvedCurrency
    });

    const snapshot = {
      calculation_version:TRIP_ECONOMICS_VERSION,
      load_id:load.id,
      load_db_id:load.db_id || null,
      vehicle_id:vehicle.id || null,
      organization_id:organization.id || load.owner_organization_id || null,
      consumption_source:consumption.source,
      ...economics,
      created_at:new Date().toISOString()
    };

    if (saveEstimate) await saveEstimate(snapshot);
    return snapshot;
  };
}

export function tripEconomicsSummary(estimate = {}) {
  const parts = [];
  parts.push(`${estimate.total_km ?? 0} km`);
  parts.push(`${estimate.estimated_liters ?? 0} L estimados`);
  if (estimate.fuel_cost != null) parts.push(`combustible ${estimate.currency || 'ARS'} ${estimate.fuel_cost}`);
  if ((estimate.toll_count || 0) > 0) parts.push(`${estimate.toll_count} peaje${estimate.toll_count === 1 ? '' : 's'} · ${estimate.toll_confidence || 'ESTIMATED'}`);
  if (estimate.variable_cost != null) parts.push(`costo variable ${estimate.currency || 'ARS'} ${estimate.variable_cost}`);
  if (estimate.preliminary_contribution != null) parts.push(`resultado preliminar ${estimate.currency || 'ARS'} ${estimate.preliminary_contribution}`);
  return parts.join(' · ');
}
