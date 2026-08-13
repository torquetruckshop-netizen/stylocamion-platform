export function evaluateCandidate(load, vehicle, match, rules) {
  const reasons = [];
  if (!load || !vehicle || !match) return { eligible:false, reasons:['MISSING_DATA'] };
  if (rules.require_green_load && load.traffic_light !== 'GREEN') reasons.push('LOAD_REVIEW');
  if (rules.require_green_vehicle && vehicle.document_state !== 'GREEN') reasons.push('VEHICLE_REVIEW');
  if (rules.require_available_vehicle && vehicle.availability !== 'AVAILABLE') reasons.push('NOT_AVAILABLE');
  if (match.total_score < rules.minimum_auto_match_score) reasons.push('LOW_SCORE');
  if (match.equipment_score !== 100) reasons.push('WRONG_EQUIPMENT');
  return { eligible: reasons.length === 0, reasons };
}

export function chooseBestEligible(load, ranking, vehicles, rules) {
  for (const match of ranking || []) {
    const vehicle = (vehicles || []).find(v => v.id === match.vehicle_id);
    const evaluation = evaluateCandidate(load, vehicle, match, rules);
    if (evaluation.eligible) return { match, vehicle, evaluation };
  }
  return { match:null, vehicle:null, evaluation:{eligible:false,reasons:['NO_ELIGIBLE_CANDIDATE']} };
}

export function routeForTrafficLight(value) {
  if (value === 'GREEN') return 'CONTINUE';
  if (value === 'YELLOW') return 'AI_REVIEW';
  return 'STYLO_REVIEW';
}
