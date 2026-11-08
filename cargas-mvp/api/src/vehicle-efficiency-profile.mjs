export const FUEL_PROFILE_VERSION = 'vehicle-fuel-profile-v1';

const DEFAULTS = Object.freeze({
  minSamples: 3,
  maxSamples: 20,
  minTripDistanceKm: 50,
  minConsumptionL100Km: 12,
  maxConsumptionL100Km: 80
});

export function buildVehicleFuelProfile(actualTrips = [], options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  const accepted = (Array.isArray(actualTrips) ? actualTrips : [])
    .map(normalizeActual)
    .filter(x => isUsable(x, cfg))
    .sort((a, b) => new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime())
    .slice(0, cfg.maxSamples);

  const rejectedCount = Math.max(0, (Array.isArray(actualTrips) ? actualTrips.length : 0) - accepted.length);
  const sampleCount = accepted.length;
  const totalDistanceKm = round(accepted.reduce((sum, x) => sum + x.distance_km, 0), 1);

  if (!sampleCount) {
    return {
      profile_version: FUEL_PROFILE_VERSION,
      status: 'INSUFFICIENT_DATA',
      ready_for_estimation: false,
      sample_count: 0,
      rejected_sample_count: rejectedCount,
      total_distance_km: 0,
      consumption_l_per_100km: null,
      standard_deviation: null,
      coefficient_of_variation: null,
      confidence: 'LOW',
      window_started_at: null,
      window_ended_at: null
    };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const sample of accepted) {
    const qualityWeight = sample.confidence === 'HIGH' ? 1 : 0.75;
    const weight = sample.distance_km * qualityWeight;
    weightedSum += sample.consumption_l_100km * weight;
    weightTotal += weight;
  }

  const avg = round(weightedSum / weightTotal, 2);
  const variance = accepted.reduce((sum, x) => sum + ((x.consumption_l_100km - avg) ** 2), 0) / sampleCount;
  const standardDeviation = round(Math.sqrt(variance), 2);
  const coefficientOfVariation = avg > 0 ? round(standardDeviation / avg, 3) : null;
  const ready = sampleCount >= cfg.minSamples;
  const confidence = profileConfidence({ sampleCount, totalDistanceKm, coefficientOfVariation, ready });

  return {
    profile_version: FUEL_PROFILE_VERSION,
    status: ready ? 'READY' : 'INSUFFICIENT_DATA',
    ready_for_estimation: ready,
    sample_count: sampleCount,
    rejected_sample_count: rejectedCount,
    total_distance_km: totalDistanceKm,
    consumption_l_per_100km: avg,
    standard_deviation: standardDeviation,
    coefficient_of_variation: coefficientOfVariation,
    confidence,
    window_started_at: accepted.at(-1)?.started_at || null,
    window_ended_at: accepted[0]?.ended_at || null
  };
}

export function resolveAdaptiveFuelConsumption({ profile = null, vehicle = {}, organization = {}, fallback = 30 } = {}) {
  if (profile?.ready_for_estimation === true && Number(profile.consumption_l_per_100km) > 0 && ['HIGH','MEDIUM'].includes(profile.confidence)) {
    return {
      value: Number(profile.consumption_l_per_100km),
      source: 'TELEMATICS_PROFILE',
      confidence: profile.confidence,
      profile_version: profile.profile_version || FUEL_PROFILE_VERSION,
      sample_count: Number(profile.sample_count || 0),
      total_distance_km: Number(profile.total_distance_km || 0)
    };
  }

  const vehicleValue = Number(vehicle.fuel_consumption_l_per_100km);
  if (Number.isFinite(vehicleValue) && vehicleValue > 0) {
    return { value:vehicleValue, source:'VEHICLE', confidence:'CONFIGURED' };
  }

  const orgValue = Number(organization.default_fuel_consumption_l_per_100km);
  if (Number.isFinite(orgValue) && orgValue > 0) {
    return { value:orgValue, source:'ORGANIZATION', confidence:'CONFIGURED' };
  }

  const defaultValue = Number(fallback);
  if (!Number.isFinite(defaultValue) || defaultValue <= 0) throw new Error('consumo de combustible inválido');
  return { value:defaultValue, source:'STYLO_DEFAULT', confidence:'DEFAULT' };
}

function normalizeActual(input = {}) {
  return {
    status: String(input.status || '').toUpperCase(),
    confidence: String(input.confidence || 'LOW').toUpperCase(),
    started_at: input.started_at || null,
    ended_at: input.ended_at || null,
    distance_km: finiteOrNull(input.distance_km),
    consumption_l_100km: finiteOrNull(input.consumption_l_100km)
  };
}

function isUsable(x, cfg) {
  if (!['MEASURED','RECONCILED'].includes(x.status)) return false;
  if (!['HIGH','MEDIUM'].includes(x.confidence)) return false;
  if (!Number.isFinite(new Date(x.ended_at).getTime())) return false;
  if (x.distance_km == null || x.distance_km < cfg.minTripDistanceKm) return false;
  if (x.consumption_l_100km == null) return false;
  if (x.consumption_l_100km < cfg.minConsumptionL100Km || x.consumption_l_100km > cfg.maxConsumptionL100Km) return false;
  return true;
}

function profileConfidence({ sampleCount, totalDistanceKm, coefficientOfVariation, ready }) {
  if (!ready) return 'LOW';
  if (sampleCount >= 5 && totalDistanceKm >= 1000 && coefficientOfVariation != null && coefficientOfVariation <= 0.15) return 'HIGH';
  return 'MEDIUM';
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}
