export const NotificationChannel = Object.freeze({
  SILENT: 'SILENT',
  PUSH: 'PUSH',
  WHATSAPP: 'WHATSAPP',
  PUSH_WHATSAPP: 'PUSH_WHATSAPP'
});

export function notificationDecision(event = {}) {
  const type = event.type || 'UNKNOWN';
  const score = Number(event.score || 0);
  const leadMinutes = Number(event.lead_minutes ?? 9999);

  if (['DOCUMENT_BLOCK', 'NO_CARRIER_BEFORE_EXPIRY', 'OPERATION_INCIDENT'].includes(type)) {
    return build('PUSH_WHATSAPP', 'CRITICAL', event);
  }

  if (type === 'ACTION_REQUIRED') {
    return build('PUSH_WHATSAPP', 'HIGH', event);
  }

  if (type === 'TRUCK_AVAILABLE_SOON_WITH_MATCH' && score >= 90 && leadMinutes <= 120) {
    return build('PUSH', 'HIGH', event);
  }

  if (type === 'MATCH_STRONG' && score >= 90) {
    return build('PUSH', 'NORMAL', event);
  }

  if (type === 'ASSIGNMENT_CONFIRMED') {
    return build('PUSH', 'NORMAL', event);
  }

  return build('SILENT', 'LOW', event);
}

function build(channel, priority, event) {
  return {
    channel,
    priority,
    notify: channel !== 'SILENT',
    title: event.title || defaultTitle(event.type, priority),
    body: event.body || event.detail || '',
    target_user_id: event.target_user_id ?? null,
    operation_id: event.operation_id ?? null,
    vehicle_id: event.vehicle_id ?? null,
    load_id: event.load_id ?? null,
    actions: actionSet(event.type),
    dedupe_key: event.dedupe_key || [event.type, event.operation_id, event.vehicle_id, event.load_id].filter(Boolean).join(':') || null
  };
}

function defaultTitle(type, priority) {
  if (type === 'DOCUMENT_BLOCK') return 'Stylo Cargas · Operación bloqueada';
  if (type === 'NO_CARRIER_BEFORE_EXPIRY') return 'Stylo Cargas · Requiere intervención';
  if (type === 'OPERATION_INCIDENT') return 'Stylo Cargas · Incidente';
  if (type === 'ACTION_REQUIRED') return 'Stylo Cargas · Acción requerida';
  if (type === 'ASSIGNMENT_CONFIRMED') return 'Stylo Cargas · Carga adjudicada';
  if (priority === 'HIGH') return 'Stylo Cargas · Oportunidad prioritaria';
  return 'Stylo Cargas · Nueva oportunidad';
}

function actionSet(type) {
  if (['ACTION_REQUIRED', 'DOCUMENT_BLOCK', 'NO_CARRIER_BEFORE_EXPIRY', 'OPERATION_INCIDENT'].includes(type)) {
    return ['OPEN', 'RESOLVE'];
  }
  if (['MATCH_STRONG', 'TRUCK_AVAILABLE_SOON_WITH_MATCH'].includes(type)) {
    return ['OPEN', 'ACCEPT', 'DISMISS'];
  }
  return ['OPEN'];
}
