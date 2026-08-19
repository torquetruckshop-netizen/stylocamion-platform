import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createWhatsAppIntakeHandler } from '../src/whatsapp-intake-service.mjs';
import { buildSharedIntake, toIntakeMessage } from '../src/share-intake.mjs';

test('camión disponible crea señal y no una carga falsa', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store);
  const shared = buildSharedIntake({
    source: 'PWA_SHARE',
    content_type: 'TEXT',
    text: 'Camión sider queda vacío hoy en Córdoba y busca carga para Santa Fe',
    sender_reference: 'USER-1',
    received_at: '2026-08-19T10:00:00-03:00',
    metadata: { authorization_reference: 'SHARE-1' }
  });
  const result = await handle({ inbound: [{ shared, intake: toIntakeMessage(shared), needs_transcription: false }] });
  assert.equal(result.saved_loads.length, 0);
  assert.equal(result.availability_signals.length, 1);
  assert.equal(result.availability_signals[0].next_action, 'UPSERT_VEHICLE_AVAILABILITY');
  assert.equal(store.listLoads().length, 0);
});

test('grupo no autorizado se descarta antes de persistir texto', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store, { authorizedGroupIds: ['G-STYLO'] });
  const shared = buildSharedIntake({
    source: 'WHATSAPP_GROUP',
    content_type: 'TEXT',
    text: 'Carga de Rosario a Córdoba, 28 tn',
    sender_reference: 'USER-2',
    received_at: '2026-08-19T10:05:00-03:00',
    metadata: { whatsapp_group_id: 'G-EXTERNO', group_authorized: false }
  });
  const result = await handle({ inbound: [{ shared, intake: toIntakeMessage(shared), needs_transcription: false }] });
  assert.equal(result.policy_rejections.length, 1);
  assert.equal(result.policy_rejections[0].reason, 'GROUP_NOT_AUTHORIZED');
  assert.equal(store.listLoads().length, 0);
});
