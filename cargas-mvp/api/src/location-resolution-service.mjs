function normalizeKeyPart(value='') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}

export function locationQueryKey(rawQuery, countryHint='') {
  return [normalizeKeyPart(countryHint), normalizeKeyPart(rawQuery)].filter(Boolean).join('|');
}

export function validCoordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

export function isUsableResolution(result, minimumConfidence = 0.65) {
  return Boolean(result)
    && validCoordinate(result.lat, -90, 90)
    && validCoordinate(result.lon, -180, 180)
    && Number(result.confidence ?? 0) >= minimumConfidence;
}

export function createLocationResolver({
  store,
  geocode,
  minimumConfidence = 0.65,
  cacheTtlDays = 180
} = {}) {
  if (!store) throw new Error('store es obligatorio');
  if (!geocode) throw new Error('geocode es obligatorio');

  return async function resolveLocation(rawQuery, { countryHint = 'AR', regionHint = null } = {}) {
    const query = String(rawQuery || '').trim();
    if (!query) return { status:'UNRESOLVED', reason:'EMPTY_QUERY', query:null };

    const queryKey = locationQueryKey(query, countryHint);
    const cached = store.getLocationResolution
      ? await store.getLocationResolution(queryKey)
      : null;

    if (cached && !isExpired(cached.expires_at) && isUsableResolution(cached, minimumConfidence)) {
      return { ...cached, status:'RESOLVED', resolution_source:'CACHE' };
    }

    const result = await geocode({ query, countryHint, regionHint });
    const normalized = {
      query_key: queryKey,
      raw_query: query,
      canonical_name: result?.canonical_name || result?.name || query,
      country_code: result?.country_code || countryHint || null,
      region_name: result?.region_name || regionHint || null,
      lat: result?.lat == null ? null : Number(result.lat),
      lon: result?.lon == null ? null : Number(result.lon),
      confidence: Number(result?.confidence ?? 0),
      provider: result?.provider || 'UNKNOWN',
      provider_reference: result?.provider_reference || null,
      metadata: result?.metadata || {},
      resolved_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + cacheTtlDays * 86400000).toISOString()
    };

    if (store.saveLocationResolution) await store.saveLocationResolution(normalized);

    if (!isUsableResolution(normalized, minimumConfidence)) {
      return {
        ...normalized,
        status:'REVIEW',
        resolution_source:'PROVIDER',
        reason:'LOW_CONFIDENCE_OR_INVALID_COORDINATES'
      };
    }

    return { ...normalized, status:'RESOLVED', resolution_source:'PROVIDER' };
  };
}

export async function enrichLoadLocations(load, resolveLocation, { countryHint='AR' } = {}) {
  if (!load) throw new Error('load es obligatorio');
  if (!resolveLocation) throw new Error('resolveLocation es obligatorio');

  const origin = load.origin
    ? await resolveLocation(load.origin, { countryHint })
    : { status:'UNRESOLVED', reason:'ORIGIN_MISSING' };
  const destination = load.destination
    ? await resolveLocation(load.destination, { countryHint })
    : { status:'UNRESOLVED', reason:'DESTINATION_MISSING' };

  const resolvedCount = [origin, destination].filter(x => x.status === 'RESOLVED').length;
  const needsReview = [origin, destination].some(x => x.status === 'REVIEW');
  const status = needsReview ? 'REVIEW' : resolvedCount === 2 ? 'RESOLVED' : resolvedCount === 1 ? 'PARTIAL' : 'UNRESOLVED';

  return {
    ...load,
    origin_lat: origin.lat ?? null,
    origin_lon: origin.lon ?? null,
    origin_country_code: origin.country_code ?? null,
    origin_region_name: origin.region_name ?? null,
    origin_location_source: origin.resolution_source ?? null,
    origin_location_confidence: origin.confidence ?? null,
    destination_lat: destination.lat ?? null,
    destination_lon: destination.lon ?? null,
    destination_country_code: destination.country_code ?? null,
    destination_region_name: destination.region_name ?? null,
    destination_location_source: destination.resolution_source ?? null,
    destination_location_confidence: destination.confidence ?? null,
    location_resolution_status: status,
    location_resolution: { origin, destination }
  };
}

function isExpired(value) {
  if (!value) return false;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) && ms <= Date.now();
}
