import { buildVehicleFuelProfile } from './vehicle-efficiency-profile.mjs';

export function createVehicleEfficiencyProfileService({ listActualTrips, saveProfile } = {}) {
  if (!listActualTrips) throw new Error('listActualTrips es obligatorio');

  return async function refreshVehicleProfile({ vehicleId, maxTrips = 20 } = {}) {
    if (!vehicleId) throw new Error('vehicleId es obligatorio');

    const actualTrips = await listActualTrips({ vehicleId, limit:maxTrips });
    const profile = {
      vehicle_id:vehicleId,
      ...buildVehicleFuelProfile(actualTrips, { maxSamples:maxTrips }),
      calculated_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };

    if (saveProfile) return saveProfile(profile);
    return profile;
  };
}
