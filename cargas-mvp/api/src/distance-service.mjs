import { haversineKm } from './engine.mjs';

export function vehicleLocationState(vehicle, now = new Date(), staleAfterMinutes = 240) {
  if (!vehicle?.location || !Number.isFinite(Number(vehicle.location.lat)) || !Number.isFinite(Number(vehicle.location.lon))) {
    return { status:'MISSING', age_minutes:null };
  }
  if (!vehicle.location_updated_at) return { status:'UNKNOWN_AGE', age_minutes:null };
  const updated = new Date(vehicle.location_updated_at).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(updated) || !Number.isFinite(current)) return { status:'UNKNOWN_AGE', age_minutes:null };
  const age = Math.max(0, (current - updated) / 60000);
  return { status: age > staleAfterMinutes ? 'STALE' : 'FRESH', age_minutes:Math.round(age) };
}

export function createEmptyDistanceResolver({
  roadDistanceProvider = null,
  estimatedRoadMultiplier = envPositiveNumber('STYLO_ESTIMATED_ROAD_MULTIPLIER', 1.18),
  staleAfterMinutes = envPositiveNumber('VEHICLE_LOCATION_STALE_MINUTES', 240),
  now = () => new Date()
} = {}) {
  return async function resolveEmptyDistance({ load, vehicle }) {
    const locationState = vehicleLocationState(vehicle, now(), staleAfterMinutes);
    const origin = load?.origin_lat == null || load?.origin_lon == null
      ? null
      : { lat:Number(load.origin_lat), lon:Number(load.origin_lon) };

    if (!origin) {
      return {
        km:9999,
        quality:'UNUSABLE',
        source:'LOAD_ORIGIN_UNRESOLVED',
        vehicle_location_state:locationState.status,
        vehicle_location_age_minutes:locationState.age_minutes
      };
    }

    if (locationState.status === 'MISSING') {
      return {
        km:9999,
        quality:'UNUSABLE',
        source:'VEHICLE_LOCATION_MISSING',
        vehicle_location_state:locationState.status,
        vehicle_location_age_minutes:locationState.age_minutes
      };
    }

    if (roadDistanceProvider && locationState.status === 'FRESH') {
      try {
        const road = await roadDistanceProvider({ from:vehicle.location, to:origin, vehicle, load });
        const km = Number(road?.km ?? road);
        if (Number.isFinite(km) && km >= 0) {
          return {
            km:Number(km.toFixed(1)),
            quality:'HIGH',
            source:road?.source || 'ROAD_ROUTING',
            vehicle_location_state:locationState.status,
            vehicle_location_age_minutes:locationState.age_minutes
          };
        }
      } catch {
        // Si el proveedor de rutas falla, degradamos a una estimación explícita.
      }
    }

    const straight = haversineKm(vehicle.location, origin);
    if (!Number.isFinite(straight) || straight >= 9999) {
      return {
        km:9999,
        quality:'UNUSABLE',
        source:'DISTANCE_UNAVAILABLE',
        vehicle_location_state:locationState.status,
        vehicle_location_age_minutes:locationState.age_minutes
      };
    }

    return {
      km:Number((straight * estimatedRoadMultiplier).toFixed(1)),
      quality:locationState.status === 'FRESH' ? 'MEDIUM' : 'LOW',
      source:locationState.status === 'FRESH' ? 'HAVERSINE_ESTIMATE' : 'STALE_LOCATION_ESTIMATE',
      straight_line_km:Number(straight.toFixed(1)),
      vehicle_location_state:locationState.status,
      vehicle_location_age_minutes:locationState.age_minutes
    };
  };
}

function envPositiveNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
