import { rankTruckOpportunities } from './fleet-opportunity-engine.mjs';

export function buildFleetDashboard({ vehicles = [], availability = [], opportunitiesByVehicle = {} } = {}) {
  const windowsByVehicle = new Map(availability.map(x => [x.vehicle_id, x]));

  return vehicles.map(vehicle => {
    const window = windowsByVehicle.get(vehicle.id) || null;
    const ranked = rankTruckOpportunities(opportunitiesByVehicle[vehicle.id] || []);
    const best = ranked[0] || null;

    return {
      vehicle_id: vehicle.id,
      plate: vehicle.plate,
      equipment_type: vehicle.equipment_type,
      availability: vehicle.availability,
      location: vehicle.location || null,
      document_state: vehicle.document_state,
      available_from: window?.available_from ?? null,
      expected_location_name: window?.expected_location_name ?? null,
      preferred_destinations: window?.preferred_destinations ?? [],
      opportunity_count: ranked.length,
      best_opportunity: best,
      attention: attentionFor(vehicle, window, best)
    };
  });
}

function attentionFor(vehicle, window, best) {
  if (vehicle.document_state === 'RED') return 'RED';
  if (!window && vehicle.availability !== 'AVAILABLE') return 'YELLOW';
  if (!best) return 'YELLOW';
  if ((best.continuity_score || 0) >= 85) return 'GREEN';
  return 'YELLOW';
}
