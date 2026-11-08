import { createLoadDecisionOrchestrator } from './load-decision-orchestrator.mjs';
import { createTripEconomicsService } from './trip-economics-service.mjs';

export function createStagingMatchService({
  store,
  contextStore,
  efficiencyProfileStore = null,
  distanceResolver,
  saveEstimate = null
} = {}) {
  if (!store) throw new Error('store es obligatorio');
  if (!contextStore) throw new Error('contextStore es obligatorio');
  if (!distanceResolver) throw new Error('distanceResolver es obligatorio');

  const economicsEstimator = createTripEconomicsService({ saveEstimate });
  const decide = createLoadDecisionOrchestrator({
    store,
    distanceResolver,
    tripEconomicsEstimator:economicsEstimator,
    fuelProfileResolver:efficiencyProfileStore?.getProfile
      ? ({vehicleId}) => efficiencyProfileStore.getProfile(vehicleId)
      : null
  });

  return async function matchLoad({ loadId, user, config = {} } = {}) {
    if (!loadId) throw Object.assign(new Error('loadId es obligatorio'), { status:400 });
    if (!user?.id) throw Object.assign(new Error('usuario requerido'), { status:401 });

    const baseLoad = await store.getLoad(loadId);
    if (!baseLoad) throw Object.assign(new Error('Carga no encontrada'), { status:404 });
    if (baseLoad.traffic_light === 'RED') throw Object.assign(new Error('Carga bloqueada por compliance'), { status:422 });

    const geo = await contextStore.getLoadContext(loadId);
    const load = { ...baseLoad, ...(geo || {}) };
    const membership = await store.getPrimaryOrganizationForUser(user.id);
    const organizationId = load.owner_organization_id || membership?.organization_id || null;
    const organization = organizationId ? await contextStore.getOrganization(organizationId) : null;

    if (!organizationId) {
      return {
        status:'NEEDS_ORGANIZATION_CONTEXT',
        load_id:load.id,
        next_action:'LINK_USER_OR_LOAD_TO_ORGANIZATION',
        decision:null
      };
    }

    const includeStyloNetwork = config.allow_stylo_network !== false;
    const rawNetwork = await store.listMatchingNetworkCandidates(organizationId, { includeStyloNetwork });
    const network = await hydrateVehicleEconomics(rawNetwork,contextStore);

    const decision = await decide({
      load,
      ownFleet:network.ownFleet,
      privateNetwork:network.privateNetwork,
      styloNetwork:network.styloNetwork,
      allowPrivateNetwork:config.allow_private_network !== false,
      allowStyloNetwork:includeStyloNetwork,
      targetUserId:user.id,
      organizationId,
      organization:organization || { id:organizationId },
      loadedKm:config.loaded_km ?? config.loadedKm ?? null,
      fuelPricePerLiter:config.fuel_price_per_liter ?? null,
      tolls:Array.isArray(config.tolls) ? config.tolls : [],
      estimatedTollCount:config.estimated_toll_count ?? 0,
      averageTollAmount:config.average_toll_amount ?? null,
      freightAmount:config.freight_amount ?? load.price_amount ?? null,
      currency:config.currency ?? load.price_currency ?? null
    });

    if (['MATCH_FOUND','NO_ELIGIBLE_MATCH'].includes(decision.status)) {
      await store.updateLoad(load.id, { status:'BUSCANDO' });
    }

    return {
      status:decision.status,
      load_id:load.id,
      organization_id:organizationId,
      network_counts:{
        own_fleet:network.ownFleet.length,
        private_network:network.privateNetwork.length,
        stylo_network:network.styloNetwork.length
      },
      location_resolution_status:load.location_resolution_status || 'UNRESOLVED',
      decision
    };
  };
}

async function hydrateVehicleEconomics(network,contextStore) {
  const levels=['ownFleet','privateNetwork','styloNetwork'];
  const ids=levels.flatMap(level=>(network[level] || []).map(x=>(x.vehicle || x)?.id).filter(Boolean));
  if (!ids.length || !contextStore.getVehicleEconomicsMap) return network;
  const economicsMap=await contextStore.getVehicleEconomicsMap(ids);
  const hydrated={...network};
  for (const level of levels) {
    hydrated[level]=(network[level] || []).map(candidate=>{
      const vehicle=candidate.vehicle || candidate;
      const economics=economicsMap.get(vehicle.id) || {};
      return candidate.vehicle
        ? {...candidate,vehicle:{...candidate.vehicle,...economics}}
        : {...candidate,...economics};
    });
  }
  return hydrated;
}
