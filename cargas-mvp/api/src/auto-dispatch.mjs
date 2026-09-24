import { chooseBestEligible } from './decision-engine.mjs';

export function prepareAutomaticDispatch({load, ranking, vehicles, rules}) {
  if (!load) return {status:'NOT_FOUND'};
  if (load.traffic_light === 'RED') return {status:'REVIEW', next_action:'STYLO_REVIEW'};
  const selected = chooseBestEligible(load, ranking, vehicles, rules);
  if (!selected.vehicle) {
    return {
      status:'NO_CANDIDATE',
      next_action: load.traffic_light === 'YELLOW' ? 'AI_REVIEW' : 'KEEP_SEARCHING',
      evaluation:selected.evaluation
    };
  }
  return {
    status:'PREASSIGN',
    next_action:'CONTACT_CARRIER',
    vehicle:selected.vehicle,
    match:selected.match
  };
}
