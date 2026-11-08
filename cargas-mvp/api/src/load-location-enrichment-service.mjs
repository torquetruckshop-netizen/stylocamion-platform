import { enrichLoadLocations } from './location-resolution-service.mjs';

export function createLoadLocationEnrichmentService({ loadStore, locationStore, resolveLocation } = {}) {
  if (!loadStore) throw new Error('loadStore es obligatorio');
  if (!locationStore) throw new Error('locationStore es obligatorio');
  if (!resolveLocation) throw new Error('resolveLocation es obligatorio');

  return async function enrichLoad({ loadId, countryHint = 'AR' } = {}) {
    if (!loadId) throw new Error('loadId es obligatorio');
    const load = await loadStore.getLoad(loadId);
    if (!load) throw Object.assign(new Error('Carga no encontrada'), { status:404 });

    const enriched = await enrichLoadLocations(load, resolveLocation, { countryHint });
    const persisted = await locationStore.saveLoadLocations(load.id, enriched);

    if (loadStore.addEvent) {
      await loadStore.addEvent({
        load_id:load.id,
        type:'LOAD_LOCATION_RESOLVED',
        actor:'SYSTEM',
        created_at:new Date().toISOString(),
        payload:{
          location_resolution_status:enriched.location_resolution_status,
          origin:{
            name:load.origin,
            lat:enriched.origin_lat,
            lon:enriched.origin_lon,
            confidence:enriched.origin_location_confidence,
            source:enriched.origin_location_source
          },
          destination:{
            name:load.destination,
            lat:enriched.destination_lat,
            lon:enriched.destination_lon,
            confidence:enriched.destination_location_confidence,
            source:enriched.destination_location_source
          }
        }
      });
    }

    return {
      load_id:load.id,
      status:enriched.location_resolution_status,
      enriched,
      persisted
    };
  };
}
