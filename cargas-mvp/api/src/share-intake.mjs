export function buildSharedIntake(input = {}) {
  const source = input.source || 'MANUAL_UPLOAD';
  const contentType = input.content_type || (input.text ? 'TEXT' : 'DOCUMENT');
  return {
    source,
    content_type: contentType,
    text: input.text ?? null,
    media_reference: input.media_reference ?? null,
    sender_reference: input.sender_reference ?? null,
    operation_channel_id: input.operation_channel_id ?? null,
    received_at: input.received_at || new Date().toISOString(),
    metadata: input.metadata || {}
  };
}

export function toIntakeMessage(shared, transcript = null) {
  const rawText = shared.content_type === 'AUDIO' ? transcript : shared.text;
  return {
    source: shared.source === 'WHATSAPP_FORWARD' ? 'GROUP_FORWARD' : shared.source,
    sender_id: shared.sender_reference,
    raw_text: rawText || '',
    received_at: shared.received_at,
    metadata: {
      ...shared.metadata,
      content_type: shared.content_type,
      media_reference: shared.media_reference,
      operation_channel_id: shared.operation_channel_id
    }
  };
}

export function requiresTranscription(shared) {
  return shared.content_type === 'AUDIO' && Boolean(shared.media_reference);
}
