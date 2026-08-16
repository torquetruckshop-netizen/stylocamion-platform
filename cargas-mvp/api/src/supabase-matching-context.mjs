import { createSupabaseAdminClient } from './supabase-store.mjs';

export function createSupabaseMatchingContextStore(client = createSupabaseAdminClient()) {
  return {
    async getLoadContext(publicId) {
      if (!publicId) return null;
      const { data, error } = await client.from('loads')
        .select('public_id,origin_lat,origin_lon,destination_lat,destination_lon,origin_country_code,origin_region_name,origin_location_confidence,destination_country_code,destination_region_name,destination_location_confidence,location_resolution_status,owner_organization_id,price_amount,price_currency')
        .eq('public_id', publicId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        origin_lat:data.origin_lat == null ? null : Number(data.origin_lat),
        origin_lon:data.origin_lon == null ? null : Number(data.origin_lon),
        destination_lat:data.destination_lat == null ? null : Number(data.destination_lat),
        destination_lon:data.destination_lon == null ? null : Number(data.destination_lon),
        origin_country_code:data.origin_country_code || null,
        origin_region_name:data.origin_region_name || null,
        origin_location_confidence:data.origin_location_confidence == null ? null : Number(data.origin_location_confidence),
        destination_country_code:data.destination_country_code || null,
        destination_region_name:data.destination_region_name || null,
        destination_location_confidence:data.destination_location_confidence == null ? null : Number(data.destination_location_confidence),
        location_resolution_status:data.location_resolution_status || 'UNRESOLVED',
        owner_organization_id:data.owner_organization_id || null,
        price_amount:data.price_amount == null ? null : Number(data.price_amount),
        price_currency:data.price_currency || 'ARS'
      };
    },

    async getOrganization(organizationId) {
      if (!organizationId) return null;
      const { data, error } = await client.from('organizations').select('*').eq('id', organizationId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        default_fuel_consumption_l_per_100km:data.default_fuel_consumption_l_per_100km == null ? null : Number(data.default_fuel_consumption_l_per_100km),
        default_fuel_price_per_liter:data.default_fuel_price_per_liter == null ? null : Number(data.default_fuel_price_per_liter),
        default_toll_average_amount:data.default_toll_average_amount == null ? null : Number(data.default_toll_average_amount)
      };
    }
  };
}
