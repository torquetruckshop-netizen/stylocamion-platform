import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createWhatsAppIntakeHandler } from '../src/whatsapp-intake-service.mjs';
import { buildSharedIntake, toIntakeMessage } from '../src/share-intake.mjs';

test('un webhook repetido no duplica la carga', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store);
  const shared = buildSharedIntake({
    source:'WHATSAPP_FORWARD',
    content_type:'TEXT',
    text:'Desde Rafaela a Rosario, 28 tn, chasis + acoplado hoy',
    sender_reference:'5493400000000',
    operation_channel_id:'PHONE_NUMBER_ID_1',
    received_at:'2026-08-15T18:00:00-03:00',
    metadata:{ whatsapp_message_id:'wamid.retry.1' }
  });
  const parsed = { inbound:[{ shared, intake:toIntakeMessage(shared), needs_transcription:false }], statuses:[] };

  const first = await handle(parsed);
  const second = await handle(parsed);

  assert.equal(first.saved_loads.length,1);
  assert.equal(second.saved_loads.length,0);
  assert.equal(second.duplicate_messages.length,1);
  assert.equal(store.listLoads().length,1);
  assert.equal(store.listIntakeMessages().length,1);
  assert.equal(store.listIntakeMessages()[0].processing_status,'COMPLETE');
});
