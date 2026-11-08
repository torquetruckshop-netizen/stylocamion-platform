import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWhatsAppInbound, extractWhatsAppStatuses } from '../src/whatsapp-webhook-adapter.mjs';

function payloadWith(message, phoneNumberId='PN-OP-01') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WABA-1',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '+54...', phone_number_id: phoneNumberId },
          messages: [message]
        }
      }]
    }]
  };
}

test('convierte texto directo de WhatsApp en intake', () => {
  const input = payloadWith({
    from: '5491111111111',
    id: 'wamid.TEXT1',
    timestamp: '1786752000',
    type: 'text',
    text: { body: 'Rosario a Córdoba, sider, 28 tn, hoy 17 hs' }
  });
  const [event] = extractWhatsAppInbound(input);
  assert.equal(event.needs_transcription, false);
  assert.equal(event.intake.source, 'WHATSAPP_DIRECT');
  assert.equal(event.intake.raw_text, 'Rosario a Córdoba, sider, 28 tn, hoy 17 hs');
  assert.equal(event.intake.metadata.operation_channel_id, 'PN-OP-01');
  assert.equal(event.intake.sender_id, '5491111111111');
});

test('marca reenvío como GROUP_FORWARD', () => {
  const input = payloadWith({
    from: '5491111111111',
    id: 'wamid.FWD1',
    timestamp: '1786752000',
    type: 'text',
    context: { forwarded: true },
    text: { body: 'Carga Rosario a Paraná hoy 11 hs, chasis con acoplado' }
  });
  const [event] = extractWhatsAppInbound(input);
  assert.equal(event.intake.source, 'GROUP_FORWARD');
  assert.equal(event.intake.metadata.forwarded, true);
});

test('audio queda pendiente de transcripción', () => {
  const input = payloadWith({
    from: '5491111111111',
    id: 'wamid.AUDIO1',
    timestamp: '1786752000',
    type: 'audio',
    audio: { id: 'MEDIA-AUDIO-1', mime_type: 'audio/ogg' }
  });
  const [event] = extractWhatsAppInbound(input);
  assert.equal(event.needs_transcription, true);
  assert.equal(event.shared.media_reference, 'MEDIA-AUDIO-1');
  assert.equal(event.intake, null);
});

test('extrae estados de mensajes', () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA-1', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: 'PN-OP-02' },
      statuses: [{ id: 'wamid.OUT1', recipient_id: '5491222222222', status: 'delivered', timestamp: '1786752100' }]
    }}]}]
  };
  const [status] = extractWhatsAppStatuses(payload);
  assert.equal(status.status, 'delivered');
  assert.equal(status.phone_number_id, 'PN-OP-02');
});
