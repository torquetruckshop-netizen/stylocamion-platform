export function summarizeTrafficDay(events = []) {
  const summary = {
    messages_processed: 0,
    loads_detected: 0,
    ignored: 0,
    assignments: 0,
    own_fleet_assignments: 0,
    private_network_assignments: 0,
    stylo_network_assignments: 0,
    manual_interventions: 0,
    empty_km_avoided: 0,
    management_minutes_saved: 0
  };

  for (const event of events) {
    if (event.type === 'WHATSAPP_MESSAGE') {
      summary.messages_processed += 1;
      if (event.classification === 'IGNORE') summary.ignored += 1;
      else if (event.classification?.startsWith('LOAD')) summary.loads_detected += 1;
    }
    if (event.type === 'ASSIGNMENT') {
      summary.assignments += 1;
      if (['AUTONOMOUS','OWN_FLEET'].includes(event.mode)) summary.own_fleet_assignments += 1;
      else if (event.mode === 'PRIVATE_NETWORK') summary.private_network_assignments += 1;
      else if (event.mode === 'STYLO_NETWORK') summary.stylo_network_assignments += 1;
    }
    if (event.type === 'KPI_UPDATE') {
      summary.empty_km_avoided = Math.max(summary.empty_km_avoided, Number(event.metrics?.empty_km_avoided || 0));
      summary.management_minutes_saved = Math.max(summary.management_minutes_saved, Number(event.metrics?.management_minutes_saved || 0));
    }
    if (event.type === 'DAY_SUMMARY') {
      Object.assign(summary, event.metrics || {});
    }
    if (event.type === 'MANUAL_INTERVENTION') summary.manual_interventions += 1;
  }

  return summary;
}

export function buildTimeline(events = []) {
  return [...events].sort((a,b) => a.time.localeCompare(b.time));
}

export function vehicleActivity(events = [], vehicle) {
  return buildTimeline(events.filter(e => e.vehicle === vehicle || e.payload?.vehicle === vehicle));
}
