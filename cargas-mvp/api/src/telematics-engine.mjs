export const TelematicsCapability = Object.freeze({
  GPS: 'GPS',
  ODOMETER: 'ODOMETER',
  TOTAL_FUEL_USED: 'TOTAL_FUEL_USED',
  FUEL_LEVEL: 'FUEL_LEVEL',
  ENGINE_HOURS: 'ENGINE_HOURS',
  IDLING_FUEL_USED: 'IDLING_FUEL_USED',
  FUEL_CONSUMPTION_RATE: 'FUEL_CONSUMPTION_RATE',
  FUEL_TRANSACTIONS: 'FUEL_TRANSACTIONS'
});

export function normalizeTelematicsReading(input = {}) {
  const observedAt = input.observed_at || input.observedAt || null;
  if (!observedAt || !Number.isFinite(new Date(observedAt).getTime())) {
    throw new Error('observed_at inválido');
  }

  const reading = {
    provider: String(input.provider || 'UNKNOWN').toUpperCase(),
    external_vehicle_id: input.external_vehicle_id || null,
    vehicle_id: input.vehicle_id || null,
    observed_at: new Date(observedAt).toISOString(),
    position: normalizePosition(input.position),
    odometer_km: finiteOrNull(input.odometer_km),
    total_fuel_used_l: finiteOrNull(input.total_fuel_used_l),
    fuel_level_percent: finiteOrNull(input.fuel_level_percent),
    engine_hours: finiteOrNull(input.engine_hours),
    idling_fuel_used_l: finiteOrNull(input.idling_fuel_used_l),
    fuel_consumption_rate_lph: finiteOrNull(input.fuel_consumption_rate_lph),
    source_quality: normalizeQuality(input.source_quality),
    raw_reference: input.raw_reference || null,
    metadata: input.metadata || {}
  };

  if (reading.fuel_level_percent != null) {
    reading.fuel_level_percent = clamp(reading.fuel_level_percent, 0, 100);
  }

  return reading;
}

export function inferCapabilities(reading = {}) {
  const caps = [];
  if (reading.position?.lat != null && reading.position?.lon != null) caps.push(TelematicsCapability.GPS);
  if (reading.odometer_km != null) caps.push(TelematicsCapability.ODOMETER);
  if (reading.total_fuel_used_l != null) caps.push(TelematicsCapability.TOTAL_FUEL_USED);
  if (reading.fuel_level_percent != null) caps.push(TelematicsCapability.FUEL_LEVEL);
  if (reading.engine_hours != null) caps.push(TelematicsCapability.ENGINE_HOURS);
  if (reading.idling_fuel_used_l != null) caps.push(TelematicsCapability.IDLING_FUEL_USED);
  if (reading.fuel_consumption_rate_lph != null) caps.push(TelematicsCapability.FUEL_CONSUMPTION_RATE);
  return caps;
}

export function calculateActualTripMetrics({
  start,
  end,
  actualFuelPricePerLiter = null,
  currency = 'ARS',
  fuelCostSource = null
} = {}) {
  if (!start || !end) throw new Error('start y end son obligatorios');
  const a = normalizeTelematicsReading(start);
  const b = normalizeTelematicsReading(end);

  const result = {
    status: 'PARTIAL',
    provider: b.provider || a.provider,
    vehicle_id: b.vehicle_id || a.vehicle_id || null,
    started_at: a.observed_at,
    ended_at: b.observed_at,
    distance_km: null,
    fuel_used_l: null,
    idling_fuel_used_l: null,
    consumption_l_100km: null,
    fuel_cost_amount: null,
    currency,
    fuel_cost_source: fuelCostSource || (actualFuelPricePerLiter != null ? 'PRICE_PER_LITER' : null),
    fuel_price_per_liter: finiteOrNull(actualFuelPricePerLiter),
    confidence: 'LOW',
    reasons: []
  };

  if (a.odometer_km != null && b.odometer_km != null) {
    const deltaKm = round(b.odometer_km - a.odometer_km, 3);
    if (deltaKm >= 0) result.distance_km = deltaKm;
    else result.reasons.push('ODOMETER_COUNTER_RESET_OR_INVALID');
  } else {
    result.reasons.push('ODOMETER_UNAVAILABLE');
  }

  if (a.total_fuel_used_l != null && b.total_fuel_used_l != null) {
    const deltaFuel = round(b.total_fuel_used_l - a.total_fuel_used_l, 3);
    if (deltaFuel >= 0) result.fuel_used_l = deltaFuel;
    else result.reasons.push('FUEL_COUNTER_RESET_OR_INVALID');
  } else {
    result.reasons.push('TOTAL_FUEL_USED_UNAVAILABLE');
  }

  if (a.idling_fuel_used_l != null && b.idling_fuel_used_l != null) {
    const deltaIdle = round(b.idling_fuel_used_l - a.idling_fuel_used_l, 3);
    if (deltaIdle >= 0) result.idling_fuel_used_l = deltaIdle;
  }

  if (result.distance_km > 0 && result.fuel_used_l != null) {
    result.consumption_l_100km = round((result.fuel_used_l / result.distance_km) * 100, 2);
  }

  if (result.fuel_used_l != null && result.fuel_price_per_liter != null) {
    result.fuel_cost_amount = round(result.fuel_used_l * result.fuel_price_per_liter, 2);
  }

  if (result.distance_km != null && result.fuel_used_l != null) {
    result.status = 'MEASURED';
    result.confidence = qualityConfidence(a.source_quality, b.source_quality);
  }

  return result;
}

export function compareEstimatedVsActual({ estimated, actual } = {}) {
  if (!estimated || !actual) return null;
  const estimatedLiters = finiteOrNull(estimated.fuel_liters ?? estimated.estimated_fuel_liters);
  const actualLiters = finiteOrNull(actual.fuel_used_l);
  const estimatedCost = finiteOrNull(estimated.fuel_cost ?? estimated.estimated_fuel_cost);
  const actualCost = finiteOrNull(actual.fuel_cost_amount);

  return {
    fuel_liters_variance: both(estimatedLiters, actualLiters) ? round(actualLiters - estimatedLiters, 2) : null,
    fuel_liters_variance_percent: both(estimatedLiters, actualLiters) && estimatedLiters !== 0
      ? round(((actualLiters - estimatedLiters) / estimatedLiters) * 100, 2)
      : null,
    fuel_cost_variance: both(estimatedCost, actualCost) ? round(actualCost - estimatedCost, 2) : null,
    fuel_cost_variance_percent: both(estimatedCost, actualCost) && estimatedCost !== 0
      ? round(((actualCost - estimatedCost) / estimatedCost) * 100, 2)
      : null
  };
}

function normalizePosition(value) {
  if (!value) return null;
  const lat = finiteOrNull(value.lat ?? value.latitude);
  const lon = finiteOrNull(value.lon ?? value.lng ?? value.longitude);
  return lat == null || lon == null ? null : { lat, lon };
}

function normalizeQuality(value) {
  const q = String(value || 'MEDIUM').toUpperCase();
  return ['HIGH','MEDIUM','LOW'].includes(q) ? q : 'MEDIUM';
}

function qualityConfidence(a, b) {
  if (a === 'LOW' || b === 'LOW') return 'LOW';
  if (a === 'HIGH' && b === 'HIGH') return 'HIGH';
  return 'MEDIUM';
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function both(a,b){ return a != null && b != null; }
function round(n,d=2){ const f=10**d; return Math.round((Number(n)+Number.EPSILON)*f)/f; }
