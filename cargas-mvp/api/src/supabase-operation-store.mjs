import { createSupabaseAdminClient, mapVehicleRow } from './supabase-store.mjs';

export function createSupabaseOperationStore(baseStore, client = createSupabaseAdminClient()) {
  if (!baseStore) throw new Error('baseStore es obligatorio');
  return {
    getLoad:id=>baseStore.getLoad(id),
    updateLoad:(id,patch)=>baseStore.updateLoad(id,patch),
    addEvent:event=>baseStore.addEvent(event),

    async getVehicle(id) {
      if (!id) return null;
      const { data, error } = await client.from('vehicles').select('*').eq('id',id).maybeSingle();
      if (error) throw error;
      return data ? mapVehicleRow(data) : null;
    },

    async updateVehicle(id, patch = {}) {
      if (!id) return null;
      const allowed=['availability','lat','lon','location_source','location_updated_at','document_state','fuel_consumption_l_per_100km'];
      const dbPatch={updated_at:new Date().toISOString()};
      for (const key of allowed) if (key in patch) dbPatch[key]=patch[key];
      const { data, error } = await client.from('vehicles').update(dbPatch).eq('id',id).select('*').single();
      if (error) throw error;
      return mapVehicleRow(data);
    }
  };
}
