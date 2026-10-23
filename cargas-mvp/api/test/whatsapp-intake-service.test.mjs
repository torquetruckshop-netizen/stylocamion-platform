import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createWhatsAppIntakeHandler } from '../src/whatsapp-intake-service.mjs';
import { buildSharedIntake, toIntakeMessage } from '../src/share-intake.mjs';

test('WhatsApp texto/reenvío se persiste como carga y conserva canal operativo', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store);
  const shared = buildSharedIntake({
    source:'WHATSAPP_FORWARD',
    content_type:'TEXT',
    text:'Desde Rafaela a Rosario, 28 tn, chasis + acoplado hoy',
    sender_reference:'5493400000000',
    operation_channel_id:'PHONE_NUMBER_ID_1',
    received_at:'2026-08-15T18:00:00-03:00',
    metadata:{ whatsapp_message_id:'wamid.1' }
  });

  const result = await handle({
    inbound:[{ shared, intake:toIntakeMessage(shared), needs_transcription:false }],
    statuses:[]
  });

  assert.equal(result.saved_loads.length,1);
  assert.equal(result.queued_audio.length,0);
  assert.equal(result.saved_loads[0].operation_channel_id,'PHONE_NUMBER_ID_1');
  assert.equal(result.saved_loads[0].source,'GROUP_FORWARD');
  assert.equal(store.listLoads().length,1);
});

test('WhatsApp audio queda en cola para transcripción y no crea carga vacía', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store);
  const shared = buildSharedIntake({
    source:'WHATSAPP_DIRECT',
    content_type:'AUDIO',
    media_reference:'MEDIA_123',
    sender_reference:'5493400000000',
    operation_channel_id:'PHONE_NUMBER_ID_2',
    received_at:'2026-08-15T18:05:00-03:00'
  });

  const result = await handle({
    inbound:[{ shared, intake:null, needs_transcription:true }],
    statuses:[]
  });

  assert.equal(result.saved_loads.length,0);
  assert.equal(result.queued_audio.length,1);
  assert.equal(result.queued_audio[0].media_reference,'MEDIA_123');
  assert.equal(result.queued_audio[0].operation_channel_id,'PHONE_NUMBER_ID_2');
  assert.equal(store.listLoads().length,0);
});
