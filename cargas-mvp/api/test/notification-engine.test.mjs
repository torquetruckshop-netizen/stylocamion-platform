import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDecision } from '../src/notification-engine.mjs';

test('carga detectada queda silenciosa', () => {
  const r = notificationDecision({ type: 'LOAD_DETECTED' });
  assert.equal(r.channel, 'SILENT');
  assert.equal(r.notify, false);
});

test('match fuerte genera push', () => {
  const r = notificationDecision({
    type: 'MATCH_STRONG', score: 96,
    vehicle_id: 'TRUCK-03', load_id: 'LOAD-88',
    detail: 'Rosario → Paraná · 8 km vacío'
  });
  assert.equal(r.channel, 'PUSH');
  assert.equal(r.priority, 'NORMAL');
  assert.deepEqual(r.actions, ['OPEN', 'ACCEPT', 'DISMISS']);
});

test('camión por quedar vacío con match fuerte genera push prioritario', () => {
  const r = notificationDecision({
    type: 'TRUCK_AVAILABLE_SOON_WITH_MATCH', score: 94, lead_minutes: 45
  });
  assert.equal(r.channel, 'PUSH');
  assert.equal(r.priority, 'HIGH');
});

test('match débil no interrumpe al usuario', () => {
  const r = notificationDecision({ type: 'MATCH_STRONG', score: 79 });
  assert.equal(r.channel, 'SILENT');
});

test('bloqueo documental usa doble canal', () => {
  const r = notificationDecision({ type: 'DOCUMENT_BLOCK', operation_id: 'OP-1' });
  assert.equal(r.channel, 'PUSH_WHATSAPP');
  assert.equal(r.priority, 'CRITICAL');
  assert.equal(r.notify, true);
});

test('acción requerida usa doble canal', () => {
  const r = notificationDecision({ type: 'ACTION_REQUIRED' });
  assert.equal(r.channel, 'PUSH_WHATSAPP');
  assert.deepEqual(r.actions, ['OPEN', 'RESOLVE']);
});
