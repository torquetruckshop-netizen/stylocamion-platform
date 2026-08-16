import { createSupabaseAdminClient } from './supabase-store.mjs';

export function createSupabaseLocationStore(client = createSupabaseAdminClient()) {
  return {
    async getLocationResolution(queryKey) {
      if (!queryKey) return null;
      const { data, error } = await client.from('location_resolution_cache')
        .select('*')
        .eq('query_key', queryKey)
        .maybeSingle();
      if (error) throw error;
      return data ? mapResolution(data) : null;
    },

    async saveLocationResolution(resolution) {
      const row = {
        query_key:resolution.query_key,
        raw_query:resolution.raw_query,
        canonical_name:resolution.canonical_name || null,
        country_code:resolution.country_code || null,
        region_name:resolution.region_name || null,
        lat:resolution.lat,
        lon:resolution.lon,
        confidence:resolution.confidence,
        provider:resolution.provider || null,
        provider_reference:resolution.provider_reference || null,
        metadata:resolution.metadata || {},
        resolved_at:resolution.resolved_at || new Date().toISOString(),
        expires_at:resolution.expires_at || null,
        updated_at:new Date().toISOString()
      };
      const { data, error } = await client.from('location_resolution_cache')
        .upsert(row, { onConflict:'query_key' })
        .select('*')
        .single();
      if (error) throw error;
      return mapResolution(data);
    },

    async saveLoadLocations(publicId, enriched) {
      if (!publicId) throw new Error('publicId es obligatorio');
      const patch = {
        origin_lat:enriched.origin_lat,
        origin_lon:enriched.origin_lon,
        origin_country_code:enriched.origin_country_code || null,
        origin_region_name:enriched.origin_region_name || null,
        origin_location_source:enriched.origin_location_source || null,
        origin_location_confidence:enriched.origin_location_confidence,
        destination_lat:enriched.destination_lat,
        destination_lon:enriched.destination_lon,
        destination_country_code:enriched.destination_country_code || null,
        destination_region_name:enriched.destination_region_name || null,
        destination_location_source:enriched.destination_location_source || null,
        destination_location_confidence:enriched.destination_location_confidence,
        location_resolution_status:enriched.location_resolution_status || 'UNRESOLVED',
        updated_at:new Date().toISOString()
      };
      const { data, error } = await client.from('loads')
        .update(patch)
        .eq('public_id', publicId)
        .select('public_id,origin_name,destination_name,origin_lat,origin_lon,destination_lat,destination_lon,origin_country_code,origin_region_name,origin_location_source,origin_location_confidence,destination_country_code,destination_region_name,destination_location_source,destination_location_confidence,location_resolution_status')
        .single();
      if (error) throw error;
      return data;
    }
  };
}

function mapResolution(row) {
  return {
    query_key:row.query_key,
    raw_query:row.raw_query,
    canonical_name:row.canonical_name,
    country_code:row.country_code,
    region_name:row.region_name,
    lat:row.lat == null ? null : Number(row.lat),
    lon:row.lon == null ? null : Number(row.lon),
    confidence:row.confidence == null ? null : Number(row.confidence),
    provider:row.provider,
    provider_reference:row.provider_reference,
    metadata:row.metadata || {},
    resolved_at:row.resolved_at,
    expires_at:row.expires_at,
    created_at:row.created_at,
    updated_at:row.updated_at
  };
}
