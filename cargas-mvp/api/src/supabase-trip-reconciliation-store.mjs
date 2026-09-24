import { createSupabaseAdminClient } from './supabase-store.mjs';

export function createSupabaseTripReconciliationStore(client = createSupabaseAdminClient()) {
  async function resolveLoadDbId(loadId) {
    if (!loadId) return null;
    const { data, error } = await client.from('loads').select('id').eq('public_id', loadId).maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }

  return {
    async saveEstimate(snapshot) {
      const loadDbId = snapshot.load_db_id || await resolveLoadDbId(snapshot.load_id);
      if (!loadDbId) throw new Error('load no encontrada para estimación');
      const row = {
        load_id:loadDbId,
        vehicle_id:snapshot.vehicle_id || null,
        organization_id:snapshot.organization_id || null,
        calculation_version:snapshot.calculation_version,
        loaded_km:snapshot.loaded_km,
        empty_km:snapshot.empty_km,
        total_km:snapshot.total_km,
        consumption_l_per_100km:snapshot.consumption_l_per_100km,
        consumption_source:snapshot.consumption_source || null,
        consumption_confidence:snapshot.consumption_confidence || null,
        fuel_profile_version:snapshot.fuel_profile_version || null,
        fuel_profile_sample_count:snapshot.fuel_profile_sample_count ?? null,
        fuel_profile_distance_km:snapshot.fuel_profile_distance_km ?? null,
        estimated_liters:snapshot.estimated_liters,
        fuel_price_per_liter:snapshot.fuel_price_per_liter,
        fuel_cost:snapshot.fuel_cost,
        toll_count:snapshot.toll_count || 0,
        confirmed_toll_count:snapshot.confirmed_toll_count || 0,
        estimated_toll_count:snapshot.estimated_toll_count || 0,
        average_toll_amount:snapshot.average_toll_amount,
        toll_cost:snapshot.toll_cost || 0,
        toll_confidence:snapshot.toll_confidence || 'NONE',
        tolls:snapshot.tolls || [],
        variable_cost:snapshot.variable_cost,
        variable_cost_per_km:snapshot.variable_cost_per_km,
        freight_amount:snapshot.freight_amount,
        preliminary_contribution:snapshot.preliminary_contribution,
        preliminary_contribution_percent:snapshot.preliminary_contribution_percent,
        currency:snapshot.currency || 'ARS',
        estimate_confidence:snapshot.estimate_confidence || 'PARTIAL',
        warnings:snapshot.warnings || [],
        created_at:snapshot.created_at || new Date().toISOString()
      };
      const { data, error } = await client.from('trip_economic_estimates').insert(row).select('*').single();
      if (error) throw error;
      return data;
    },

    async findBoundaryReading({ vehicleId, at, direction = 'NEAREST_BEFORE', toleranceMinutes = 60 } = {}) {
      if (!vehicleId || !at) return null;
      let query = client.from('telematics_readings').select('*').eq('vehicle_id', vehicleId);
      if (direction === 'NEAREST_AFTER') {
        query = query.gte('observed_at', at).order('observed_at', { ascending:true }).limit(1);
      } else {
        query = query.lte('observed_at', at).order('observed_at', { ascending:false }).limit(1);
      }
      const { data, error } = await query;
      if (error) throw error;
      const row = data?.[0] || null;
      if (!row) return null;
      const diffMinutes = Math.abs(new Date(row.observed_at).getTime() - new Date(at).getTime()) / 60000;
      if (!Number.isFinite(diffMinutes) || diffMinutes > toleranceMinutes) return null;
      return mapReading(row);
    },

    async getLatestEstimate({ loadId, vehicleId } = {}) {
      const loadDbId = await resolveLoadDbId(loadId);
      if (!loadDbId) return null;
      let query = client.from('trip_economic_estimates').select('*').eq('load_id', loadDbId).order('created_at', { ascending:false }).limit(1);
      if (vehicleId) query = query.eq('vehicle_id', vehicleId);
      const { data, error } = await query;
      if (error) throw error;
      return data?.[0] || null;
    },

    async saveTripActual(record) {
      const loadDbId = record.load_db_id || await resolveLoadDbId(record.load_id);
      if (!loadDbId) throw new Error('load no encontrada para dato real');
      const row = {
        load_id:loadDbId,
        vehicle_id:record.vehicle_id,
        provider:record.provider || null,
        started_at:record.started_at,
        ended_at:record.ended_at,
        distance_km:record.distance_km,
        fuel_used_l:record.fuel_used_l,
        idling_fuel_used_l:record.idling_fuel_used_l,
        consumption_l_100km:record.consumption_l_100km,
        fuel_price_per_liter:record.fuel_price_per_liter,
        fuel_cost_amount:record.fuel_cost_amount,
        currency:record.currency || 'ARS',
        fuel_cost_source:record.fuel_cost_source || null,
        confidence:record.confidence || 'LOW',
        status:record.status || 'PARTIAL',
        estimated_snapshot_id:record.estimated_snapshot_id || null,
        variance:record.variance || {},
        created_at:record.created_at || new Date().toISOString(),
        updated_at:new Date().toISOString()
      };
      const { data, error } = await client.from('telematics_trip_actuals').insert(row).select('*').single();
      if (error) throw error;
      return data;
    }
  };
}

function mapReading(row) {
  return {
    provider:row.provider,
    external_vehicle_id:row.external_vehicle_id || null,
    vehicle_id:row.vehicle_id,
    observed_at:row.observed_at,
    position:row.lat == null || row.lon == null ? null : { lat:Number(row.lat), lon:Number(row.lon) },
    odometer_km:row.odometer_km == null ? null : Number(row.odometer_km),
    total_fuel_used_l:row.total_fuel_used_l == null ? null : Number(row.total_fuel_used_l),
    fuel_level_percent:row.fuel_level_percent == null ? null : Number(row.fuel_level_percent),
    engine_hours:row.engine_hours == null ? null : Number(row.engine_hours),
    idling_fuel_used_l:row.idling_fuel_used_l == null ? null : Number(row.idling_fuel_used_l),
    fuel_consumption_rate_lph:row.fuel_consumption_rate_lph == null ? null : Number(row.fuel_consumption_rate_lph),
    source_quality:row.source_quality || 'MEDIUM',
    raw_reference:row.raw_reference || null,
    metadata:row.metadata || {}
  };
}
