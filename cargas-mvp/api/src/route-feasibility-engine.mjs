export const ROUTE_FEASIBILITY_VERSION = 'route-feasibility-v1';

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

function finite(value, fallback = null) {
  if (value === '' || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateCargoGeometry({ lengthM, widthM, heightM, densityKgM3, weightTn } = {}) {
  const dimensions = [lengthM, widthM, heightM].map(value => finite(value));
  const volumeM3 = dimensions.every(value => value != null && value > 0)
    ? round(dimensions.reduce((total, value) => total * value, 1), 3)
    : null;
  const density = finite(densityKgM3);
  const declaredWeightTn = finite(weightTn);
  const estimatedWeightTn = volumeM3 != null && density != null && density > 0
    ? round(volumeM3 * density / 1000, 3)
    : null;

  return {
    volume_m3: volumeM3,
    declared_weight_tn: declaredWeightTn,
    estimated_weight_tn: estimatedWeightTn,
    weight_variance_tn: declaredWeightTn != null && estimatedWeightTn != null
      ? round(declaredWeightTn - estimatedWeightTn, 3)
      : null
  };
}

export function calculateAxleDistribution({ grossWeightTn, axleGroups = [] } = {}) {
  const gross = finite(grossWeightTn, 0);
  const groups = axleGroups.map((group, index) => {
    const share = finite(group.sharePct, 0);
    const actual = round(gross * share / 100, 3);
    const limit = finite(group.legalLimitTn);
    return {
      id: group.id || `AXLE_GROUP_${index + 1}`,
      share_pct: share,
      estimated_weight_tn: actual,
      configured_limit_tn: limit,
      within_configured_limit: limit == null ? null : actual <= limit
    };
  });
  const shareTotal = round(groups.reduce((sum, group) => sum + group.share_pct, 0), 3);
  return {
    gross_weight_tn: gross,
    share_total_pct: shareTotal,
    distribution_valid: Math.abs(shareTotal - 100) <= 0.5,
    axle_groups: groups,
    overloaded_groups: groups.filter(group => group.within_configured_limit === false).map(group => group.id)
  };
}

export function estimateTopographyImpact({ baseConsumptionL100Km, ascentM = 0, descentM = 0, distanceKm = 0 } = {}) {
  const base = finite(baseConsumptionL100Km, 0);
  const distance = finite(distanceKm, 0);
  if (base <= 0 || distance <= 0) return { adjusted_consumption_l_100km: null, factor: null, confidence: 'UNUSABLE' };
  const ascentPer100Km = finite(ascentM, 0) / distance * 100;
  const descentPer100Km = finite(descentM, 0) / distance * 100;
  // Conservative configurable approximation: ascent penalizes more than descent recovers.
  const factor = Math.min(1.45, Math.max(0.9, 1 + ascentPer100Km * 0.00012 - descentPer100Km * 0.000035));
  return {
    adjusted_consumption_l_100km: round(base * factor, 2),
    factor: round(factor, 4),
    ascent_m_per_100km: round(ascentPer100Km, 1),
    descent_m_per_100km: round(descentPer100Km, 1),
    confidence: 'ESTIMATED'
  };
}

export function evaluateRouteFeasibility({ cargo = {}, vehicle = {}, route = {}, legalRules = {} } = {}) {
  const geometry = calculateCargoGeometry(cargo);
  const payloadLimit = finite(vehicle.payloadCapacityTn);
  const cargoWeight = geometry.declared_weight_tn ?? geometry.estimated_weight_tn;
  const grossWeight = cargoWeight == null ? null : round(cargoWeight + finite(vehicle.tareWeightTn, 0), 3);
  const axles = calculateAxleDistribution({ grossWeightTn: grossWeight, axleGroups: vehicle.axleGroups || [] });
  const topography = estimateTopographyImpact({
    baseConsumptionL100Km: vehicle.baseConsumptionL100Km,
    ascentM: route.ascentM,
    descentM: route.descentM,
    distanceKm: route.distanceKm
  });
  const blockers = [];
  const warnings = [];

  if (cargoWeight == null) warnings.push('CARGO_WEIGHT_MISSING');
  if (payloadLimit == null) warnings.push('PAYLOAD_LIMIT_MISSING');
  if (cargoWeight != null && payloadLimit != null && cargoWeight > payloadLimit) blockers.push('PAYLOAD_EXCEEDED');
  if (!axles.distribution_valid && axles.axle_groups.length) blockers.push('AXLE_DISTRIBUTION_INVALID');
  if (axles.overloaded_groups.length) blockers.push('AXLE_LIMIT_EXCEEDED');
  if (legalRules.routeAuthorized === false) blockers.push('ROUTE_NOT_AUTHORIZED');
  if (legalRules.vehicleAuthorized === false) blockers.push('VEHICLE_NOT_AUTHORIZED');
  if (legalRules.requiresHumanReview === true) warnings.push('LEGAL_REVIEW_REQUIRED');

  return {
    version: ROUTE_FEASIBILITY_VERSION,
    status: blockers.length ? 'BLOCKED' : warnings.length ? 'REVIEW' : 'CLEAR',
    geometry,
    gross_weight_tn: grossWeight,
    axle_distribution: axles,
    topography,
    blockers,
    warnings,
    auto_dispatch_allowed: blockers.length === 0 && warnings.length === 0
  };
}
