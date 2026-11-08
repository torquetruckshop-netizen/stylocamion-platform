import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createWhatsAppIntakeHandler } from '../src/whatsapp-intake-service.mjs';
import { createAudioIntakeProcessor } from '../src/audio-intake-processor.mjs';
import { buildSharedIntake } from '../src/share-intake.mjs';

test('audio persistido se transcribe, normaliza y no se duplica al reintentar', async () => {
  const store = new MemoryStore();
  const handle = createWhatsAppIntakeHandler(store);
  const shared = buildSharedIntake({
    source:'WHATSAPP_DIRECT',
    content_type:'AUDIO',
    media_reference:'MEDIA_AUDIO_1',
    sender_reference:'5493400000000',
    operation_channel_id:'PHONE_NUMBER_ID_AUDIO',
    received_at:'2026-08-15T18:05:00-03:00',
    metadata:{ whatsapp_message_id:'wamid.audio.1' }
  });

  const intakeResult = await handle({
    inbound:[{ shared, intake:null, needs_transcription:true }],
    statuses:[]
  });

  assert.equal(intakeResult.queued_audio.length,1);
  const job = intakeResult.queued_audio[0];

  let downloads = 0;
  let transcriptions = 0;
  const processAudio = createAudioIntakeProcessor({
    store,
    downloadMedia: async ({ media_reference }) => {
      downloads += 1;
      assert.equal(media_reference,'MEDIA_AUDIO_1');
      return { bytes:new Uint8Array([1,2,3]), filename:'carga.ogg', mimeType:'audio/ogg' };
    },
    transcribeAudio: async () => {
      transcriptions += 1;
      return {
        text:'Desde Rafaela a Rosario, 28 tn, chasis + acoplado mañana',
        model:'mock-transcribe',
        language:'es'
      };
    }
  });

  const first = await processAudio(job);
  assert.equal(first.status,'COMPLETE');
  assert.equal(first.load.origin,'Rafaela');
  assert.equal(first.load.destination,'Rosario');
  assert.equal(first.load.weight_tn,28);
  assert.equal(first.load.equipment_required,'chasis + acoplado');
  assert.equal(first.load.operation_channel_id,'PHONE_NUMBER_ID_AUDIO');
  assert.equal(store.listLoads().length,1);
  assert.equal(store.getIntakeMessage(job.intake_id).processing_status,'COMPLETE');

  const second = await processAudio(job);
  assert.equal(second.status,'ALREADY_COMPLETE');
  assert.equal(store.listLoads().length,1);
  assert.equal(downloads,1);
  assert.equal(transcriptions,1);
});
