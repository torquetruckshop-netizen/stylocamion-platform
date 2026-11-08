import { runPriorityMatching } from './network-matching-engine.mjs';
import { buildNotificationOutboxItem } from './notification-outbox.mjs';

export function createLoadDecisionOrchestrator({
  store,
  distanceResolver,
  rules,
  tripEconomicsEstimator = null,
  fuelProfileResolver = null
} = {}) {
  if (!store) throw new Error('store es obligatorio');

  return async function decideLoad({
    load,
    ownFleet = [],
    privateNetwork = [],
    styloNetwork = [],
    allowPrivateNetwork = true,
    allowStyloNetwork = true,
    targetUserId = null,
    organizationId = null,
    organization = {},
    fuelProfile = null,
    loadedKm = null,
    fuelPricePerLiter = null,
    tolls = [],
    estimatedTollCount = 0,
    averageTollAmount = null,
    freightAmount = null,
    currency = null
  } = {}) {
    if (!load) throw new Error('load es obligatorio');

    const decidedAt = new Date().toISOString();
    const result = await runPriorityMatching({
      load,
      ownFleet,
      privateNetwork,
      styloNetwork,
      allowPrivateNetwork,
      allowStyloNetwork,
      distanceResolver,
      rules
    });

    const selected = result.selected ? {
      vehicle_id: result.selected.vehicle?.id || null,
      carrier_id: result.selected.carrier?.id || result.selected.vehicle?.carrier_id || null,
      total_score: result.selected.match?.total_score ?? null,
      distance_km: result.selected.match?.distance_km ?? null,
      equipment_score: result.selected.match?.equipment_score ?? null,
      documents_score: result.selected.match?.documents_score ?? null,
      availability_score: result.selected.match?.availability_score ?? null,
      distance_score: result.selected.match?.distance_score ?? null,
      reputation_score: result.selected.match?.reputation_score ?? null
    } : null;

    const profileResolution = await resolveFuelProfile({
      explicitProfile:fuelProfile,
      resolver:fuelProfileResolver,
      result
    });

    const economicEvaluation = await calculateEconomicsIfPossible({
      estimator:tripEconomicsEstimator,
      result,
      load,
      organization:{ id:organizationId || organization.id || null, ...organization },
      fuelProfile:profileResolution.profile,
      loadedKm,
      fuelPricePerLiter,
      tolls,
      estimatedTollCount,
      averageTollAmount,
      freightAmount,
      currency
    });

    if (store.addEvent) {
      await store.addEvent({
        load_id: load.id,
        type: 'AI_MATCH_DECISION',
        actor: 'AI',
        created_at: decidedAt,
        payload: {
          decision_version: result.policy?.decision_version || null,
          status: result.status,
          network_level: result.network_level || null,
          next_action: result.next_action || null,
          selected,
          fuel_profile_resolution:profileResolution.status,
          fuel_profile_error:profileResolution.error || null,
          economics_status:economicEvaluation.status,
          economics:economicEvaluation.estimate || null,
          trace: result.trace || [],
          policy: result.policy || null,
          missing_fields: result.missing_fields || []
        }
      });
    }

    let alert = null;
    let alert_status = 'NOT_REQUIRED';

    const alertEvent = buildAlertEvent({ result, load, targetUserId, organizationId, economics:economicEvaluation.estimate });
    if (alertEvent) {
      const outboxItem = buildNotificationOutboxItem(alertEvent);
      if (!outboxItem) {
        alert_status = 'SILENT_BY_POLICY';
      } else if (!targetUserId) {
        alert_status = 'DEFERRED_NO_RECIPIENT';
        if (store.addEvent) {
          await store.addEvent({
            load_id: load.id,
            type: 'ALERT_DEFERRED_NO_RECIPIENT',
            actor: 'SYSTEM',
            created_at: new Date().toISOString(),
            payload: {
              event_type: alertEvent.type,
              channel: outboxItem.channel,
              priority: outboxItem.priority,
              dedupe_key: outboxItem.dedupe_key
            }
          });
        }
      } else if (store.addNotificationOutbox) {
        alert = await store.addNotificationOutbox(outboxItem);
        alert_status = alert ? 'QUEUED' : 'NOT_QUEUED';
      } else {
        alert_status = 'OUTBOX_UNAVAILABLE';
      }
    }

    return {
      ...result,
      selected_summary: selected,
      fuel_profile:profileResolution.profile,
      fuel_profile_resolution:profileResolution.status,
      fuel_profile_error:profileResolution.error || null,
      economics:economicEvaluation.estimate,
      economics_status:economicEvaluation.status,
      economics_error:economicEvaluation.error || null,
      alert,
      alert_status,
      decided_at: decidedAt
    };
  };
}

async function resolveFuelProfile({ explicitProfile, resolver, result }) {
  if (explicitProfile) return { status:'EXPLICIT', profile:explicitProfile, error:null };
  const vehicleId = result.selected?.vehicle?.id || null;
  if (!resolver || !vehicleId) return { status:'NOT_AVAILABLE', profile:null, error:null };
  try {
    const profile = await resolver({ vehicleId, vehicle:result.selected.vehicle });
    return { status:profile ? 'RESOLVED' : 'NOT_FOUND', profile:profile || null, error:null };
  } catch (error) {
    return { status:'RESOLUTION_FAILED', profile:null, error:error.message || 'fuel_profile_resolution_failed' };
  }
}

async function calculateEconomicsIfPossible({ estimator, result, load, organization, fuelProfile, loadedKm, fuelPricePerLiter, tolls, estimatedTollCount, averageTollAmount, freightAmount, currency }) {
  if (!estimator || result.status !== 'MATCH_FOUND' || !result.selected?.vehicle) {
    return { status:'NOT_REQUESTED', estimate:null, error:null };
  }
  const resolvedLoadedKm = loadedKm ?? load.loaded_route_km ?? null;
  if (resolvedLoadedKm == null) {
    return { status:'WAITING_ROUTE_DISTANCE', estimate:null, error:null };
  }
  try {
    const estimate = await estimator({
      load,
      vehicle:result.selected.vehicle,
      organization,
      fuelProfile,
      loadedKm:resolvedLoadedKm,
      emptyKm:result.selected.match?.distance_km ?? 0,
      fuelPricePerLiter,
      tolls,
      estimatedTollCount,
      averageTollAmount,
      freightAmount,
      currency
    });
    return { status:'CALCULATED', estimate, error:null };
  } catch (error) {
    return { status:'CALCULATION_FAILED', estimate:null, error:error.message || 'trip_economics_failed' };
  }
}

function buildAlertEvent({ result, load, targetUserId, organizationId, economics = null }) {
  if (result.status === 'MATCH_FOUND' && result.selected?.match) {
    const match = result.selected.match;
    const economicsText = economics?.variable_cost != null
      ? ` · Costo variable ${economics.currency || 'ARS'} ${economics.variable_cost}`
      : '';
    return {
      type: 'MATCH_STRONG',
      score: match.total_score,
      target_user_id: targetUserId,
      organization_id: organizationId,
      load_id: load.id,
      vehicle_id: result.selected.vehicle?.id || null,
      title: 'Stylo Cargas · Oportunidad encontrada',
      body: `${result.network_level} · Match ${match.total_score}% · ${match.distance_km} km vacío${economicsText}`,
      dedupe_key: `MATCH_STRONG:${load.id}:${result.selected.vehicle?.id || 'NO_VEHICLE'}`
    };
  }

  if (result.status === 'NO_ELIGIBLE_MATCH') {
    return {
      type: 'ACTION_REQUIRED',
      target_user_id: targetUserId,
      organization_id: organizationId,
      load_id: load.id,
      title: 'Stylo Cargas · Sin unidad elegible',
      body: 'No se encontró una unidad compatible en los niveles habilitados.',
      dedupe_key: `NO_ELIGIBLE_MATCH:${load.id}`
    };
  }

  if (result.status === 'NEEDS_VALIDATION') {
    return {
      type: 'LOAD_NEEDS_VALIDATION',
      target_user_id: targetUserId,
      organization_id: organizationId,
      load_id: load.id,
      title: 'Stylo Cargas · Carga en validación',
      body: `Faltan datos: ${(result.missing_fields || []).join(', ')}`,
      dedupe_key: `LOAD_NEEDS_VALIDATION:${load.id}`
    };
  }

  return null;
}
