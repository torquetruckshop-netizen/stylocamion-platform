import { buildSharedIntake, toIntakeMessage } from './share-intake.mjs';

export function extractWhatsAppInbound(payload = {}) {
  const results = [];
  if (payload.object !== 'whatsapp_business_account') return results;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id || null;

      for (const message of value.messages || []) {
        const content = extractContent(message);
        if (!content) continue;

        const shared = buildSharedIntake({
          source: message.context?.forwarded ? 'WHATSAPP_FORWARD' : 'WHATSAPP_DIRECT',
          content_type: content.content_type,
          text: content.text,
          media_reference: content.media_reference,
          sender_reference: message.from || null,
          operation_channel_id: phoneNumberId,
          received_at: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
          metadata: {
            whatsapp_message_id: message.id || null,
            whatsapp_type: message.type || null,
            waba_id: entry.id || null,
            phone_number_id: phoneNumberId,
            forwarded: Boolean(message.context?.forwarded),
            frequently_forwarded: Boolean(message.context?.frequently_forwarded)
          }
        });

        results.push({
          shared,
          intake: content.content_type === 'AUDIO' ? null : toIntakeMessage(shared),
          needs_transcription: content.content_type === 'AUDIO'
        });
      }
    }
  }

  return results;
}

function extractContent(message = {}) {
  switch (message.type) {
    case 'text':
      return { content_type: 'TEXT', text: message.text?.body || '', media_reference: null };
    case 'audio':
      return { content_type: 'AUDIO', text: null, media_reference: message.audio?.id || null };
    case 'document':
      return { content_type: 'DOCUMENT', text: message.document?.caption || null, media_reference: message.document?.id || null };
    case 'image':
      return { content_type: 'IMAGE', text: message.image?.caption || null, media_reference: message.image?.id || null };
    default:
      return null;
  }
}

export function extractWhatsAppStatuses(payload = {}) {
  const statuses = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      for (const status of change.value?.statuses || []) {
        statuses.push({
          message_id: status.id || null,
          recipient_id: status.recipient_id || null,
          status: status.status || null,
          timestamp: status.timestamp
            ? new Date(Number(status.timestamp) * 1000).toISOString()
            : null,
          phone_number_id: change.value?.metadata?.phone_number_id || null
        });
      }
    }
  }
  return statuses;
}
