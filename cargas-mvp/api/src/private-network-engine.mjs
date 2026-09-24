export function buildSearchPlan(load, context = {}) {
  const plan = [];
  const ownFleet = Array.isArray(context.ownFleet) ? context.ownFleet : [];
  const privateNetwork = Array.isArray(context.privateNetwork) ? context.privateNetwork : [];
  const styloNetwork = Array.isArray(context.styloNetwork) ? context.styloNetwork : [];

  plan.push({ level: 'OWN_FLEET', candidates: ownFleet });
  if (context.allowPrivateNetwork !== false) {
    plan.push({ level: 'PRIVATE_NETWORK', candidates: privateNetwork });
  }
  if (context.allowStyloNetwork === true) {
    plan.push({ level: 'STYLO_NETWORK', candidates: styloNetwork });
  }

  return {
    load_id: load.id,
    current_level: load.escalation_level || 'OWN_FLEET',
    steps: plan
  };
}

export function nextEscalationLevel(level, policy = {}) {
  if (level === 'OWN_FLEET' && policy.privateNetwork !== false) return 'PRIVATE_NETWORK';
  if (level === 'PRIVATE_NETWORK' && policy.styloNetwork === true) return 'STYLO_NETWORK';
  if (level === 'STYLO_NETWORK' && policy.publicNetwork === true) return 'PUBLIC';
  return null;
}

export function chooseBestCandidate(matches = [], minimumScore = 90) {
  return [...matches]
    .filter(m => m.total_score >= minimumScore)
    .sort((a, b) => b.total_score - a.total_score)[0] || null;
}

export function privateNetworkOffer(load, candidate, channelId = null) {
  return {
    type: 'PRIVATE_NETWORK_OFFER',
    load_id: load.id,
    vehicle_id: candidate.vehicle_id,
    carrier_id: candidate.carrier_id,
    operation_channel_id: channelId,
    response_options: ['ACCEPT', 'REJECT', 'ASK_DETAILS'],
    expires_in_minutes: 5
  };
}
