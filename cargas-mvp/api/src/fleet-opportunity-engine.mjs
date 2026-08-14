export function buildTruckNeed(vehicle, availabilityWindow) {
  return {
    vehicle_id: vehicle.id,
    carrier_id: vehicle.carrier_id,
    equipment_type: vehicle.equipment_type,
    capacity_tn: vehicle.capacity_tn ?? null,
    available_from: availabilityWindow.available_from,
    available_until: availabilityWindow.available_until ?? null,
    expected_location_name: availabilityWindow.expected_location_name ?? null,
    preferred_destinations: availabilityWindow.preferred_destinations ?? [],
    source: availabilityWindow.source ?? 'MANUAL'
  };
}

export function opportunityScore({ matchScore = 0, emptyKm = 9999, waitMinutes = 9999, destinationPreference = false }) {
  const emptyKmScore = Math.max(0, 100 - Math.min(emptyKm, 300) / 3);
  const waitScore = Math.max(0, 100 - Math.min(waitMinutes, 360) / 3.6);
  const destinationScore = destinationPreference ? 100 : 50;
  return Math.round(matchScore * 0.50 + emptyKmScore * 0.25 + waitScore * 0.15 + destinationScore * 0.10);
}

export function rankTruckOpportunities(opportunities = []) {
  return opportunities
    .map(x => ({ ...x, continuity_score: opportunityScore(x) }))
    .sort((a, b) => b.continuity_score - a.continuity_score);
}
