import { createSupabaseAdminClient } from './supabase-store.mjs';

export function createSupabaseEfficiencyProfileStore(client = createSupabaseAdminClient()) {
  return {
    async listActualTrips({ vehicleId, limit = 20 } = {}) {
      if (!vehicleId) return [];
      const { data, error } = await client.from('telematics_trip_actuals')
        .select('status,confidence,started_at,ended_at,distance_km,fuel_used_l,consumption_l_100km')
        .eq('vehicle_id', vehicleId)
        .in('status', ['MEASURED','RECONCILED'])
        .in('confidence', ['HIGH','MEDIUM'])
        .order('ended_at', { ascending:false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async saveProfile(profile) {
      const row = {
        vehicle_id:profile.vehicle_id,
        profile_version:profile.profile_version,
        status:profile.status,
        ready_for_estimation:Boolean(profile.ready_for_estimation),
        consumption_l_per_100km:profile.consumption_l_per_100km,
        sample_count:Number(profile.sample_count || 0),
        rejected_sample_count:Number(profile.rejected_sample_count || 0),
        total_distance_km:Number(profile.total_distance_km || 0),
        standard_deviation:profile.standard_deviation,
        coefficient_of_variation:profile.coefficient_of_variation,
        confidence:profile.confidence || 'LOW',
        window_started_at:profile.window_started_at,
        window_ended_at:profile.window_ended_at,
        calculated_at:profile.calculated_at || new Date().toISOString(),
        updated_at:new Date().toISOString()
      };
      const { data, error } = await client.from('vehicle_efficiency_profiles')
        .upsert(row, { onConflict:'vehicle_id' })
        .select('*')
        .single();
      if (error) throw error;
      return mapProfile(data);
    },

    async getProfile(vehicleId) {
      if (!vehicleId) return null;
      const { data, error } = await client.from('vehicle_efficiency_profiles')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data) : null;
    }
  };
}

function mapProfile(row) {
  return {
    vehicle_id:row.vehicle_id,
    profile_version:row.profile_version,
    status:row.status,
    ready_for_estimation:Boolean(row.ready_for_estimation),
    consumption_l_per_100km:row.consumption_l_per_100km == null ? null : Number(row.consumption_l_per_100km),
    sample_count:Number(row.sample_count || 0),
    rejected_sample_count:Number(row.rejected_sample_count || 0),
    total_distance_km:Number(row.total_distance_km || 0),
    standard_deviation:row.standard_deviation == null ? null : Number(row.standard_deviation),
    coefficient_of_variation:row.coefficient_of_variation == null ? null : Number(row.coefficient_of_variation),
    confidence:row.confidence,
    window_started_at:row.window_started_at,
    window_ended_at:row.window_ended_at,
    calculated_at:row.calculated_at,
    updated_at:row.updated_at
  };
}
