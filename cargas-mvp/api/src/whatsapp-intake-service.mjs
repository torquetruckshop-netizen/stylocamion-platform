import { normalizeIntake } from './engine.mjs';

export function createWhatsAppIntakeHandler(store) {
  if (!store) throw new Error('store es obligatorio');

  return async function handleWhatsAppParsed(parsed = {}) {
    const savedLoads = [];
    const queuedAudio = [];

    for (const event of parsed.inbound || []) {
      if (event.needs_transcription) {
        queuedAudio.push({
          media_reference: event.shared?.media_reference || null,
          sender_reference: event.shared?.sender_reference || null,
          operation_channel_id: event.shared?.operation_channel_id || null,
          received_at: event.shared?.received_at || new Date().toISOString()
        });
        continue;
      }

      const intake = event.intake;
      if (!intake?.raw_text?.trim()) continue;

      const load = normalizeIntake(intake);
      load.operation_channel_id = event.shared?.operation_channel_id || intake.metadata?.operation_channel_id || null;
      const saved = await store.addLoad(load);
      savedLoads.push(saved);

      if (store.addEvent) {
        await store.addEvent({
          load_id: saved.id,
          type: 'WHATSAPP_INTAKE_PERSISTED',
          actor: 'SYSTEM',
          created_at: new Date().toISOString(),
          payload: {
            source: intake.source,
            operation_channel_id: load.operation_channel_id,
            whatsapp_message_id: intake.metadata?.whatsapp_message_id || null,
            missing_fields: saved.missing_fields || load.missing_fields || []
          }
        });
      }
    }

    return {
      saved_loads: savedLoads,
      queued_audio: queuedAudio,
      status_events: parsed.statuses || []
    };
  };
}
