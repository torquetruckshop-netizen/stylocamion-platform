import { normalizeIntake } from './engine.mjs';

export function createAudioIntakeProcessor({ store, downloadMedia, transcribeAudio, onLoadSaved = null } = {}) {
  if (!store) throw new Error('store es obligatorio');
  if (!downloadMedia) throw new Error('downloadMedia es obligatorio');
  if (!transcribeAudio) throw new Error('transcribeAudio es obligatorio');

  return async function processAudioJob(job = {}) {
    const intakeId = job.intake_id;
    if (!intakeId || !store.getIntakeMessage) throw new Error('intake_id inválido');

    let intake = await store.getIntakeMessage(intakeId);
    if (!intake) throw new Error('intake no encontrado');

    if (intake.processing_status === 'COMPLETE') {
      return { status: 'ALREADY_COMPLETE', intake, load: null };
    }

    if (!intake.media_reference) {
      await markFailed(store, intake.id, 'MEDIA_REFERENCE_MISSING');
      throw new Error('media_reference faltante');
    }

    try {
      if (store.claimIntakeMessage) {
        const claimed = await store.claimIntakeMessage(intake.id, ['AWAITING_TRANSCRIPTION','FAILED','RECEIVED']);
        if (!claimed) return { status: 'ALREADY_CLAIMED', intake: await store.getIntakeMessage(intake.id), load: null };
        intake = claimed;
      } else if (store.updateIntakeMessage) {
        intake = await store.updateIntakeMessage(intake.id, { processing_status: 'PROCESSING', processing_error: null });
      }

      const media = await downloadMedia({
        media_reference: intake.media_reference,
        metadata: intake.metadata || {},
        operation_channel_id: intake.operation_channel_id || null
      });

      const transcription = await transcribeAudio({
        bytes: media.bytes,
        filename: media.filename || 'audio.ogg',
        mimeType: media.mimeType || 'audio/ogg',
        language: media.language || 'es'
      });

      const text = String(transcription.text || '').trim();
      if (!text) throw new Error('transcripción vacía');

      if (store.updateIntakeMessage) {
        intake = await store.updateIntakeMessage(intake.id, {
          raw_text: text,
          classification: 'LOAD',
          processing_status: 'PROCESSING',
          processing_error: null,
          metadata: {
            ...(intake.metadata || {}),
            transcription_model: transcription.model || null,
            transcription_language: transcription.language || 'es',
            transcription_usage: transcription.usage || null
          }
        });
      }

      const normalized = normalizeIntake({
        source: intake.source,
        sender_id: intake.sender_id,
        raw_text: text,
        received_at: intake.received_at,
        metadata: {
          ...(intake.metadata || {}),
          content_type: 'AUDIO',
          media_reference: intake.media_reference,
          operation_channel_id: intake.operation_channel_id
        }
      });
      normalized.intake_message_id = intake.id;
      normalized.operation_channel_id = intake.operation_channel_id || null;

      const saved = await store.addLoad(normalized);

      if (store.updateIntakeMessage) {
        intake = await store.updateIntakeMessage(intake.id, {
          processing_status: 'COMPLETE',
          processing_error: null,
          processed_at: new Date().toISOString()
        });
      }

      if (store.addEvent) {
        await store.addEvent({
          load_id: saved.id,
          type: 'AUDIO_TRANSCRIBED_AND_NORMALIZED',
          actor: 'AI',
          created_at: new Date().toISOString(),
          payload: {
            intake_id: intake.id,
            media_reference: intake.media_reference,
            transcription_model: transcription.model || null,
            missing_fields: saved.missing_fields || normalized.missing_fields || []
          }
        });
      }

      if (onLoadSaved) await onLoadSaved(saved, { intake, transcription });

      return { status: 'COMPLETE', intake, load: saved, transcription };
    } catch (error) {
      await markFailed(store, intake.id, error.message || 'AUDIO_PROCESSING_FAILED');
      throw error;
    }
  };
}

async function markFailed(store, intakeId, message) {
  if (!store.updateIntakeMessage) return;
  await store.updateIntakeMessage(intakeId, {
    processing_status: 'FAILED',
    processing_error: message
  });
}
