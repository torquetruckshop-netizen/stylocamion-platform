import { normalizeIntake } from './engine.mjs';
import { evaluateDigitalIntake } from './digital-intake-policy-engine.mjs';

function sourceForEvent(event = {}) {
  if (event.intake?.source) return event.intake.source;
  if (event.shared?.source === 'WHATSAPP_FORWARD') return 'GROUP_FORWARD';
  return event.shared?.source || 'WHATSAPP_DIRECT';
}

function externalMessageId(event = {}) {
  return event.shared?.metadata?.whatsapp_message_id || event.intake?.metadata?.whatsapp_message_id || null;
}

function buildIntakeRecord(event = {}) {
  const shared = event.shared || {};
  return {
    source: sourceForEvent(event),
    external_message_id: externalMessageId(event),
    sender_id: event.intake?.sender_id || shared.sender_reference || null,
    raw_text: event.intake?.raw_text || null,
    content_type: shared.content_type || event.intake?.metadata?.content_type || 'TEXT',
    media_reference: shared.media_reference || event.intake?.metadata?.media_reference || null,
    operation_channel_id: shared.operation_channel_id || event.intake?.metadata?.operation_channel_id || null,
    received_at: shared.received_at || event.intake?.received_at || new Date().toISOString(),
    metadata: {
      ...(shared.metadata || {}),
      ...(event.intake?.metadata || {})
    },
    processing_status: event.needs_transcription ? 'AWAITING_TRANSCRIPTION' : 'RECEIVED'
  };
}

function alreadyHandled(intake) {
  return ['COMPLETE','PROCESSING'].includes(intake?.processing_status);
}

function duplicateDescriptor(intake, record) {
  return {
    intake_id: intake?.id || null,
    external_message_id: record.external_message_id,
    processing_status: intake?.processing_status || null
  };
}

export function createWhatsAppIntakeHandler(store, { onLoadSaved = null, authorizedGroupIds = [] } = {}) {
  if (!store) throw new Error('store es obligatorio');

  return async function handleWhatsAppParsed(parsed = {}) {
    const savedLoads = [];
    const queuedAudio = [];
    const duplicates = [];
    const availabilitySignals = [];
    const reviewSignals = [];
    const policyRejections = [];

    for (const event of parsed.inbound || []) {
      const record = buildIntakeRecord(event);
      const policy = evaluateDigitalIntake({
        source: event.shared?.source || record.source,
        text: event.intake?.raw_text || record.raw_text,
        contentType: record.content_type,
        metadata: record.metadata,
        authorizedGroupIds
      });
      if (!policy.authorization.allowed) {
        policyRejections.push({
          external_message_id: record.external_message_id,
          source: policy.authorization.source,
          reason: policy.authorization.reason,
          policy_version: policy.policy_version
        });
        continue;
      }
      record.metadata = { ...record.metadata, digital_intake_policy: policy };
      let persisted = null;

      if (record.external_message_id && store.getIntakeByExternalMessage) {
        persisted = await store.getIntakeByExternalMessage(record.source, record.external_message_id);
        if (alreadyHandled(persisted)) {
          duplicates.push(duplicateDescriptor(persisted, record));
          continue;
        }
      }

      if (!persisted && store.addIntakeMessage) {
        persisted = await store.addIntakeMessage(record);
      }

      if (event.needs_transcription) {
        if (persisted && !['AWAITING_TRANSCRIPTION','PROCESSING','COMPLETE'].includes(persisted.processing_status) && store.updateIntakeMessage) {
          persisted = await store.updateIntakeMessage(persisted.id, {
            processing_status: 'AWAITING_TRANSCRIPTION',
            processing_error: null
          });
        }
        queuedAudio.push({
          intake_id: persisted?.id || null,
          media_reference: record.media_reference,
          sender_reference: record.sender_id,
          operation_channel_id: record.operation_channel_id,
          received_at: record.received_at,
          source: record.source,
          metadata: record.metadata
        });
        continue;
      }

      if (policy.classification.intent === 'TRUCK_AVAILABLE') {
        availabilitySignals.push({
          intake_id: persisted?.id || null,
          sender_reference: record.sender_id,
          operation_channel_id: record.operation_channel_id,
          raw_text: event.intake?.raw_text || record.raw_text,
          confidence: policy.classification.confidence,
          next_action: policy.next_action,
          policy_version: policy.policy_version
        });
        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            classification: 'TRUCK_AVAILABLE',
            processing_status: 'COMPLETE',
            processing_error: null,
            processed_at: new Date().toISOString()
          });
        }
        continue;
      }

      if (policy.classification.intent === 'IRRELEVANT') {
        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            classification: 'IRRELEVANT',
            processing_status: 'IGNORED',
            processing_error: null,
            processed_at: new Date().toISOString()
          });
        }
        continue;
      }

      if (policy.classification.intent === 'UNKNOWN') {
        reviewSignals.push({
          intake_id: persisted?.id || null,
          sender_reference: record.sender_id,
          raw_text: event.intake?.raw_text || record.raw_text,
          confidence: policy.classification.confidence,
          next_action: policy.next_action,
          policy_version: policy.policy_version
        });
        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            classification: 'UNKNOWN',
            processing_status: 'RECEIVED',
            processing_error: 'AI_CLASSIFICATION_REQUIRED'
          });
        }
        continue;
      }

      const intake = event.intake;
      if (!intake?.raw_text?.trim()) {
        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            processing_status: 'IGNORED',
            processing_error: 'EMPTY_TEXT',
            processed_at: new Date().toISOString()
          });
        }
        continue;
      }

      try {
        if (persisted?.id && store.claimIntakeMessage) {
          const claimed = await store.claimIntakeMessage(persisted.id, ['RECEIVED','FAILED']);
          if (!claimed) {
            duplicates.push(duplicateDescriptor(await store.getIntakeMessage(persisted.id), record));
            continue;
          }
          persisted = claimed;
        } else if (persisted?.id && store.updateIntakeMessage) {
          persisted = await store.updateIntakeMessage(persisted.id, { processing_status: 'PROCESSING', processing_error: null });
        }

        if (persisted?.id && store.getLoadByIntakeMessageId) {
          const existingLoad = await store.getLoadByIntakeMessageId(persisted.id);
          if (existingLoad) {
            if (store.updateIntakeMessage) {
              await store.updateIntakeMessage(persisted.id, {
                classification: 'LOAD',
                processing_status: 'COMPLETE',
                processing_error: null,
                processed_at: new Date().toISOString()
              });
            }
            duplicates.push(duplicateDescriptor(persisted, record));
            continue;
          }
        }

        const load = normalizeIntake(intake);
        load.intake_message_id = persisted?.id || null;
        load.operation_channel_id = record.operation_channel_id;
        const saved = await store.addLoad(load);
        savedLoads.push(saved);

        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            classification: 'LOAD',
            processing_status: 'COMPLETE',
            processing_error: null,
            processed_at: new Date().toISOString()
          });
        }

        if (store.addEvent) {
          await store.addEvent({
            load_id: saved.id,
            type: 'WHATSAPP_INTAKE_PERSISTED',
            actor: 'SYSTEM',
            created_at: new Date().toISOString(),
            payload: {
              intake_id: persisted?.id || null,
              source: intake.source,
              operation_channel_id: load.operation_channel_id,
              whatsapp_message_id: record.external_message_id,
              missing_fields: saved.missing_fields || load.missing_fields || []
            }
          });
        }

        if (onLoadSaved) await onLoadSaved(saved, { intake: persisted, event });
      } catch (error) {
        if (persisted?.id && store.updateIntakeMessage) {
          await store.updateIntakeMessage(persisted.id, {
            processing_status: 'FAILED',
            processing_error: error.message || 'PROCESSING_FAILED'
          });
        }
        throw error;
      }
    }

    return {
      saved_loads: savedLoads,
      queued_audio: queuedAudio,
      duplicate_messages: duplicates,
      availability_signals: availabilitySignals,
      review_signals: reviewSignals,
      policy_rejections: policyRejections,
      status_events: parsed.statuses || []
    };
  };
}
