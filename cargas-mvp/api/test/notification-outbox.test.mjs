import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationOutboxItem, deliveryTargets, shouldEscalateDelivery } from '../src/notification-outbox.mjs';

test('evento silencioso no entra a outbox', () => {
  assert.equal(buildNotificationOutboxItem({ type: 'LOAD_DETECTED' }), null);
});

test('match fuerte crea aviso pendiente', () => {
  const item = buildNotificationOutboxItem({
    type: 'MATCH_STRONG', score: 95, target_user_id: 'USER-1', vehicle_id: 'TRUCK-1'
  }, new Date('2026-08-14T12:00:00Z'));
  assert.equal(item.channel, 'PUSH');
  assert.equal(item.status, 'PENDING');
  assert.equal(item.target_user_id, 'USER-1');
});

test('doble canal genera push para cada dispositivo y whatsapp', () => {
  const item = buildNotificationOutboxItem({ type: 'DOCUMENT_BLOCK', target_user_id: 'USER-1' });
  const targets = deliveryTargets(item, [
    { id: 'PHONE-A', is_active: true, push_subscription: { endpoint: 'https://push/a' } },
    { id: 'PHONE-B', is_active: false, push_subscription: { endpoint: 'https://push/b' } }
  ]);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].type, 'PUSH');
  assert.equal(targets[1].type, 'WHATSAPP');
});

test('alerta crítica escala si push no llegó después de 2 minutos', () => {
  const item = buildNotificationOutboxItem({ type: 'OPERATION_INCIDENT', target_user_id: 'USER-1' });
  assert.equal(shouldEscalateDelivery({ outboxItem: item, pushDelivered: false, ageMinutes: 2 }), true);
  assert.equal(shouldEscalateDelivery({ outboxItem: item, pushDelivered: true, ageMinutes: 10 }), false);
});
