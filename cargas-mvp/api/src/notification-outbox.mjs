import { notificationDecision } from './notification-engine.mjs';

export function buildNotificationOutboxItem(event = {}, now = new Date()) {
  const decision = notificationDecision(event);
  if (!decision.notify) return null;

  return {
    target_user_id: decision.target_user_id,
    organization_id: event.organization_id ?? null,
    operation_id: decision.operation_id,
    load_id: decision.load_id,
    vehicle_id: decision.vehicle_id,
    event_type: event.type || 'UNKNOWN',
    channel: decision.channel,
    priority: decision.priority,
    title: decision.title,
    body: decision.body,
    actions: decision.actions,
    dedupe_key: decision.dedupe_key,
    status: 'PENDING',
    attempts: 0,
    available_at: now.toISOString()
  };
}

export function deliveryTargets(outboxItem, devices = []) {
  if (!outboxItem) return [];
  const activeDevices = devices.filter(d => d.is_active !== false);
  const targets = [];

  if (['PUSH', 'PUSH_WHATSAPP'].includes(outboxItem.channel)) {
    for (const device of activeDevices) {
      if (device.push_subscription) {
        targets.push({
          type: 'PUSH',
          device_id: device.id,
          subscription: device.push_subscription
        });
      }
    }
  }

  if (['WHATSAPP', 'PUSH_WHATSAPP'].includes(outboxItem.channel)) {
    targets.push({ type: 'WHATSAPP', target_user_id: outboxItem.target_user_id });
  }

  return targets;
}

export function shouldEscalateDelivery({ outboxItem, pushDelivered = false, ageMinutes = 0 }) {
  if (!outboxItem) return false;
  if (!['HIGH', 'CRITICAL'].includes(outboxItem.priority)) return false;
  if (pushDelivered) return false;
  return ageMinutes >= (outboxItem.priority === 'CRITICAL' ? 2 : 10);
}
