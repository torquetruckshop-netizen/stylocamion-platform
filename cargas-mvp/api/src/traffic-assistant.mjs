export function shouldStartSearch({ now, availableFrom, leadMinutes = 120 }) {
  if (!availableFrom) return false;
  const nowMs = new Date(now).getTime();
  const availableMs = new Date(availableFrom).getTime();
  if (!Number.isFinite(nowMs) || !Number.isFinite(availableMs)) return false;
  const diffMinutes = (availableMs - nowMs) / 60000;
  return diffMinutes <= leadMinutes && diffMinutes >= -30;
}

export function nextTrafficAction({ opportunityCount = 0, bestScore = 0, privateNetworkEnabled = true, styloNetworkEnabled = false }) {
  if (opportunityCount > 0 && bestScore >= 85) {
    return { action:'PROPOSE_BEST_LOAD', target:'OWN_FLEET', priority:'HIGH' };
  }
  if (privateNetworkEnabled) {
    return { action:'SEARCH_PRIVATE_NETWORK', target:'PRIVATE_NETWORK', priority:'MEDIUM' };
  }
  if (styloNetworkEnabled) {
    return { action:'SEARCH_STYLO_NETWORK', target:'STYLO_NETWORK', priority:'MEDIUM' };
  }
  return { action:'ALERT_NO_LOAD', target:'OWNER', priority:'HIGH' };
}

export function buildTrafficAlert({ vehicle, window, bestOpportunity = null }) {
  if (bestOpportunity) {
    return {
      type:'OPPORTUNITY_FOUND',
      vehicle_id:vehicle.id,
      title:`${vehicle.plate}: próxima carga encontrada`,
      message:`Match ${bestOpportunity.continuity_score}% · ${bestOpportunity.emptyKm ?? '?'} km vacío`,
      action:'VIEW_OPPORTUNITY'
    };
  }
  return {
    type:'VEHICLE_WILL_BE_EMPTY',
    vehicle_id:vehicle.id,
    title:`${vehicle.plate}: quedará disponible`,
    message:`${window?.expected_location_name || 'Ubicación a confirmar'} · ${window?.available_from || ''}`,
    action:'SEARCH_LOADS'
  };
}
