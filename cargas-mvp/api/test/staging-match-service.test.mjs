import test from 'node:test';
import assert from 'node:assert/strict';
import { createStagingMatchService } from '../src/staging-match-service.mjs';

function candidate(id, organizationId='ORG-1') {
  return {
    vehicle:{
      id,
      carrier_id:`CAR-${id}`,
      organization_id:organizationId,
      equipment_type:'chasis + acoplado',
      capacity_tn:30,
      availability:'AVAILABLE',
      document_state:'GREEN',
      location:{lat:-31.2,lon:-61.5},
      location_updated_at:'2026-08-16T01:00:00Z'
    },
    carrier:{id:`CAR-${id}`,status:'ACTIVE',reputation_score:5}
  };
}

function makeStore({ membership=true } = {}) {
  const events=[];
  const updates=[];
  const notifications=[];
  return {
    events,updates,notifications,
    async getLoad(){
      return {id:'SC-1',db_id:'LOAD-DB-1',traffic_light:'GREEN',missing_fields:[],equipment_required:'chasis + acoplado',weight_tn:28,status:'PUBLICADA'};
    },
    async getPrimaryOrganizationForUser(){ return membership ? {organization_id:'ORG-1'} : null; },
    async listMatchingNetworkCandidates(){
      return {ownFleet:[candidate('OWN-1')],privateNetwork:[candidate('PRIV-1','ORG-2')],styloNetwork:[candidate('STYLO-1','ORG-3')]};
    },
    async updateLoad(id,patch){ updates.push({id,patch}); return {...patch,id}; },
    async addEvent(event){ events.push(event); return event; },
    async addNotificationOutbox(item){ notifications.push(item); return item; }
  };
}

test('staging v2 respeta Mi Flota antes de redes externas', async () => {
  const store=makeStore();
  const contextStore={
    async getLoadContext(){ return {origin_lat:-31.25,origin_lon:-61.48,location_resolution_status:'RESOLVED',price_amount:900000,price_currency:'ARS'}; },
    async getOrganization(){ return {id:'ORG-1',default_fuel_price_per_liter:1500,default_toll_average_amount:8000}; }
  };
  const service=createStagingMatchService({
    store,
    contextStore,
    efficiencyProfileStore:{async getProfile(){return null;}},
    distanceResolver:async ({level})=>({km:level==='OWN_FLEET'?25:5,quality:'MEDIUM',source:'TEST'})
  });

  const result=await service({loadId:'SC-1',user:{id:'USER-1'},config:{loaded_km:300}});
  assert.equal(result.status,'MATCH_FOUND');
  assert.equal(result.decision.network_level,'OWN_FLEET');
  assert.equal(result.decision.selected.vehicle.id,'OWN-1');
  assert.deepEqual(result.network_counts,{own_fleet:1,private_network:1,stylo_network:1});
  assert.equal(store.updates[0].patch.status,'BUSCANDO');
});

test('staging v2 usa perfil telemétrico si existe', async () => {
  const store=makeStore();
  const contextStore={
    async getLoadContext(){ return {origin_lat:-31.25,origin_lon:-61.48,location_resolution_status:'RESOLVED',price_amount:900000,price_currency:'ARS'}; },
    async getOrganization(){ return {id:'ORG-1',default_fuel_price_per_liter:1500}; }
  };
  const service=createStagingMatchService({
    store,
    contextStore,
    efficiencyProfileStore:{async getProfile(){return {ready_for_estimation:true,profile_version:'vehicle-fuel-profile-v1',consumption_l_per_100km:27,sample_count:8,total_distance_km:3000,confidence:'HIGH'};}},
    distanceResolver:async ()=>({km:0,quality:'HIGH',source:'TEST'})
  });

  const result=await service({loadId:'SC-1',user:{id:'USER-1'},config:{loaded_km:400}});
  assert.equal(result.decision.economics.consumption_source,'TELEMATICS_PROFILE');
  assert.equal(result.decision.economics.consumption_l_per_100km,27);
  assert.equal(result.decision.economics.estimated_liters,108);
});

test('si no hay perfil telemétrico conserva el consumo configurado del camión', async () => {
  const store=makeStore();
  const contextStore={
    async getLoadContext(){ return {origin_lat:-31.25,origin_lon:-61.48,location_resolution_status:'RESOLVED',price_currency:'ARS'}; },
    async getOrganization(){ return {id:'ORG-1',default_fuel_consumption_l_per_100km:30,default_fuel_price_per_liter:1500}; },
    async getVehicleEconomicsMap(ids){
      assert.ok(ids.includes('OWN-1'));
      return new Map([['OWN-1',{fuel_consumption_l_per_100km:33}]]);
    }
  };
  const service=createStagingMatchService({
    store,
    contextStore,
    efficiencyProfileStore:{async getProfile(){return null;}},
    distanceResolver:async ()=>({km:0,quality:'HIGH',source:'TEST'})
  });

  const result=await service({loadId:'SC-1',user:{id:'USER-1'},config:{loaded_km:100}});
  assert.equal(result.decision.economics.consumption_source,'VEHICLE');
  assert.equal(result.decision.economics.consumption_l_per_100km,33);
  assert.equal(result.decision.economics.estimated_liters,33);
});

test('sin organización no abre la búsqueda a toda la red', async () => {
  const store=makeStore({membership:false});
  const contextStore={
    async getLoadContext(){ return {origin_lat:-31.25,origin_lon:-61.48,location_resolution_status:'RESOLVED'}; },
    async getOrganization(){ throw new Error('no debería consultarse'); }
  };
  const service=createStagingMatchService({store,contextStore,distanceResolver:async()=>({km:0,quality:'HIGH'})});
  const result=await service({loadId:'SC-1',user:{id:'USER-1'}});
  assert.equal(result.status,'NEEDS_ORGANIZATION_CONTEXT');
  assert.equal(result.decision,null);
});
