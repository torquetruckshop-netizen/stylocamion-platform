import { scoreVehicle } from './engine.mjs';
import { evaluateCandidate } from './decision-engine.mjs';
import { buildSearchPlan } from './private-network-engine.mjs';
import { notificationDecision } from './notification-engine.mjs';

const DEFAULT_RULES = Object.freeze({
  require_green_load: true,
  require_green_vehicle: true,
  require_available_vehicle: true,
  minimum_auto_match_score: 85
});

export async function runPriorityMatching({
  load,
  ownFleet = [],
  privateNetwork = [],
  styloNetwork = [],
  allowPrivateNetwork = true,
  allowStyloNetwork = true,
  distanceResolver = async () => 9999,
  rules = DEFAULT_RULES
} = {}) {
  if (!load) return { status:'LOAD_NOT_FOUND', selected:null, trace:[] };
  if (load.traffic_light !== 'GREEN') {
    return {
      status:'NEEDS_VALIDATION',
      selected:null,
      trace:[],
      missing_fields:load.missing_fields || []
    };
  }

  const plan = buildSearchPlan(load, {
    ownFleet,
    privateNetwork,
    styloNetwork,
    allowPrivateNetwork,
    allowStyloNetwork
  });

  const trace = [];

  for (const step of plan.steps) {
    const scored = [];

    for (const candidate of step.candidates || []) {
      const vehicle = candidate.vehicle || candidate;
      const carrier = candidate.carrier || candidate.carrier_data || {};
      if (!vehicle?.id) continue;
      if (carrier.status && carrier.status !== 'ACTIVE') continue;

      const distanceKm = Number(await distanceResolver({ load, vehicle, carrier, level:step.level }));
      const safeDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 9999;
      const match = {
        ...scoreVehicle(load, vehicle, carrier, safeDistance),
        network_level:step.level
      };
      const evaluation = evaluateCandidate(load, vehicle, match, rules);
      scored.push({ match, vehicle, carrier, evaluation });
    }

    scored.sort((a,b) => b.match.total_score - a.match.total_score);
    const eligible = scored.filter(x => x.evaluation.eligible);
    const best = eligible[0] || null;

    trace.push({
      level:step.level,
      candidate_count:scored.length,
      eligible_count:eligible.length,
      best_score:scored[0]?.match?.total_score ?? null,
      rejection_reasons:scored
        .filter(x => !x.evaluation.eligible)
        .slice(0,5)
        .map(x => ({ vehicle_id:x.vehicle.id, reasons:x.evaluation.reasons }))
    });

    if (!best) continue;

    const notification = notificationDecision({
      type:'MATCH_STRONG',
      score:best.match.total_score,
      load_id:load.id,
      vehicle_id:best.vehicle.id,
      title:'Stylo Cargas · Oportunidad encontrada',
      body:`${step.level} · Match ${best.match.total_score}% · ${best.match.distance_km} km vacío`
    });

    return {
      status:'MATCH_FOUND',
      network_level:step.level,
      selected:best,
      next_action:actionForLevel(step.level),
      notification,
      trace
    };
  }

  return {
    status:'NO_ELIGIBLE_MATCH',
    network_level:null,
    selected:null,
    next_action:allowStyloNetwork ? 'KEEP_SEARCHING_STYLO_NETWORK' : 'REQUEST_OPERATOR_REVIEW',
    notification:notificationDecision({
      type:'ACTION_REQUIRED',
      load_id:load.id,
      title:'Stylo Cargas · Sin unidad elegible',
      body:'No se encontró una unidad compatible en los niveles habilitados.'
    }),
    trace
  };
}

function actionForLevel(level) {
  if (level === 'OWN_FLEET') return 'PROPOSE_TO_OWN_FLEET';
  if (level === 'PRIVATE_NETWORK') return 'OFFER_TO_PRIVATE_NETWORK';
  if (level === 'STYLO_NETWORK') return 'OFFER_TO_STYLO_NETWORK';
  return 'OPERATOR_REVIEW';
}
