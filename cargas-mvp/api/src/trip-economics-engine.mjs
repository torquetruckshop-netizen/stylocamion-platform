export const DEFAULT_FUEL_CONSUMPTION_L_PER_100KM = 30;

function money(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nonNegative(value, name, fallback = 0) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} inválido`);
  return n;
}

export function resolveFuelConsumption({ vehicle = {}, organization = {}, fallback = DEFAULT_FUEL_CONSUMPTION_L_PER_100KM } = {}) {
  const vehicleValue = Number(vehicle.fuel_consumption_l_per_100km);
  if (Number.isFinite(vehicleValue) && vehicleValue > 0) {
    return { value: vehicleValue, source: 'VEHICLE' };
  }
  const orgValue = Number(organization.default_fuel_consumption_l_per_100km);
  if (Number.isFinite(orgValue) && orgValue > 0) {
    return { value: orgValue, source: 'ORGANIZATION' };
  }
  const defaultValue = Number(fallback);
  if (!Number.isFinite(defaultValue) || defaultValue <= 0) throw new Error('consumo de combustible inválido');
  return { value: defaultValue, source: 'STYLO_DEFAULT' };
}

export function calculateFuel({ loadedKm = 0, emptyKm = 0, consumptionLPer100Km = DEFAULT_FUEL_CONSUMPTION_L_PER_100KM, fuelPricePerLiter = null } = {}) {
  const loaded = nonNegative(loadedKm, 'loadedKm');
  const empty = nonNegative(emptyKm, 'emptyKm');
  const consumption = nonNegative(consumptionLPer100Km, 'consumptionLPer100Km');
  if (consumption <= 0) throw new Error('consumptionLPer100Km inválido');
  const totalKm = loaded + empty;
  const liters = money(totalKm * consumption / 100);
  const price = fuelPricePerLiter == null ? null : nonNegative(fuelPricePerLiter, 'fuelPricePerLiter');
  return {
    loaded_km: loaded,
    empty_km: empty,
    total_km: totalKm,
    consumption_l_per_100km: consumption,
    estimated_liters: liters,
    fuel_price_per_liter: price,
    fuel_cost: price == null ? null : money(liters * price)
  };
}

export function calculateTolls({ tolls = [], estimatedTollCount = 0, averageTollAmount = 0 } = {}) {
  const normalized = (Array.isArray(tolls) ? tolls : [])
    .filter(Boolean)
    .map((toll, index) => ({
      id: toll.id || `TOLL-${index + 1}`,
      name: toll.name || null,
      segment: toll.segment || 'LOADED',
      amount: toll.amount == null ? null : nonNegative(toll.amount, 'toll.amount'),
      currency: toll.currency || null,
      source: toll.source || null,
      confirmed: toll.confirmed === true || toll.amount != null
    }));

  const confirmed = normalized.filter(x => x.amount != null);
  const confirmedCost = confirmed.reduce((sum, x) => sum + x.amount, 0);
  const requestedCount = Math.max(normalized.length, Math.floor(nonNegative(estimatedTollCount, 'estimatedTollCount')));
  const missingCount = Math.max(0, requestedCount - confirmed.length);
  const average = nonNegative(averageTollAmount, 'averageTollAmount');
  const estimatedCost = missingCount * average;
  const total = money(confirmedCost + estimatedCost);

  let confidence = 'NONE';
  if (requestedCount > 0 && missingCount === 0) confidence = 'CONFIRMED';
  else if (confirmed.length > 0 && missingCount > 0) confidence = 'MIXED';
  else if (requestedCount > 0) confidence = 'ESTIMATED';

  return {
    toll_count: requestedCount,
    confirmed_toll_count: confirmed.length,
    estimated_toll_count: missingCount,
    average_toll_amount: average,
    toll_cost: total,
    toll_confidence: confidence,
    tolls: normalized
  };
}

export function calculateTripEconomics({
  loadedKm = 0,
  emptyKm = 0,
  consumptionLPer100Km = DEFAULT_FUEL_CONSUMPTION_L_PER_100KM,
  fuelPricePerLiter = null,
  tolls = [],
  estimatedTollCount = 0,
  averageTollAmount = 0,
  freightAmount = null,
  currency = 'ARS'
} = {}) {
  const fuel = calculateFuel({ loadedKm, emptyKm, consumptionLPer100Km, fuelPricePerLiter });
  const toll = calculateTolls({ tolls, estimatedTollCount, averageTollAmount });
  const freight = freightAmount == null ? null : nonNegative(freightAmount, 'freightAmount');
  const fuelCost = fuel.fuel_cost;
  const variableCost = fuelCost == null ? null : money(fuelCost + toll.toll_cost);
  const contribution = freight == null || variableCost == null ? null : money(freight - variableCost);
  const contributionPercent = freight == null || freight === 0 || contribution == null
    ? null
    : money(contribution / freight * 100);
  const costPerKm = variableCost == null || fuel.total_km === 0 ? null : money(variableCost / fuel.total_km);

  let confidence = 'HIGH';
  const warnings = [];
  if (fuel.fuel_price_per_liter == null) {
    confidence = 'PARTIAL';
    warnings.push('FUEL_PRICE_MISSING');
  }
  if (toll.toll_confidence === 'ESTIMATED' || toll.toll_confidence === 'MIXED') {
    if (confidence === 'HIGH') confidence = 'ESTIMATED';
    warnings.push('TOLLS_NOT_FULLY_CONFIRMED');
  }

  return {
    currency,
    ...fuel,
    ...toll,
    variable_cost: variableCost,
    variable_cost_per_km: costPerKm,
    freight_amount: freight,
    preliminary_contribution: contribution,
    preliminary_contribution_percent: contributionPercent,
    estimate_confidence: confidence,
    warnings
  };
}
