import { runPriorityMatching } from './network-matching-engine.mjs';
import { buildNotificationOutboxItem } from './notification-outbox.mjs';

export function createLoadDecisionOrchestrator({ store, distanceResolver, rules } = {}) {
  if (!store) throw new Error('store es obligatorio');

  return async function decideLoad({
    load,
    ownFleet = [],
    privateNetwork = [],
    styloNetwork = [],
    allowPrivateNetwork = true,
    allowStyloNetwork = true,
    targetUserId = null,
    organizationId = null
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
          trace: result.trace || [],
          policy: result.policy || null,
          missing_fields: result.missing_fields || []
        }
      });
    }

    let alert = null;
    let alert_status = 'NOT_REQUIRED';

    const alertEvent = buildAlertEvent({ result, load, targetUserId, organizationId });
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
      alert,
      alert_status,
      decided_at: decidedAt
    };
  };
}

function buildAlertEvent({ result, load, targetUserId, organizationId }) {
  if (result.status === 'MATCH_FOUND' && result.selected?.match) {
    const match = result.selected.match;
    return {
      type: 'MATCH_STRONG',
      score: match.total_score,
      target_user_id: targetUserId,
      organization_id: organizationId,
      load_id: load.id,
      vehicle_id: result.selected.vehicle?.id || null,
      title: 'Stylo Cargas · Oportunidad encontrada',
      body: `${result.network_level} · Match ${match.total_score}% · ${match.distance_km} km vacío`,
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
