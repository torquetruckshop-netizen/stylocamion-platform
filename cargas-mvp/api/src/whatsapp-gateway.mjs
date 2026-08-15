import http from 'node:http';
import { URL } from 'node:url';
import { extractWhatsAppInbound, extractWhatsAppStatuses } from './whatsapp-webhook-adapter.mjs';

const PORT = Number(process.env.WHATSAPP_GATEWAY_PORT || 8790);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

export function verifyWebhook(url, expectedToken) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && expectedToken && token === expectedToken && challenge) {
    return { ok: true, challenge };
  }
  return { ok: false, challenge: null };
}

export function processWebhookPayload(payload) {
  return {
    inbound: extractWhatsAppInbound(payload),
    statuses: extractWhatsAppStatuses(payload)
  };
}

export function createWhatsAppGateway({ verifyToken = process.env.WHATSAPP_VERIFY_TOKEN } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/webhooks/whatsapp') {
      const result = verifyWebhook(url, verifyToken);
      if (!result.ok) return json(res, 403, { error: 'verification_failed' });
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end(result.challenge);
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
      try {
        const payload = await readJson(req);
        const parsed = processWebhookPayload(payload);
        // El siguiente adaptador persistirá/encolará parsed.inbound y parsed.statuses.
        return json(res, 200, {
          received: true,
          inbound_count: parsed.inbound.length,
          status_count: parsed.statuses.length,
          events: parsed.inbound.map(x => ({
            source: x.shared.source,
            content_type: x.shared.content_type,
            operation_channel_id: x.shared.operation_channel_id,
            needs_transcription: x.needs_transcription
          }))
        });
      } catch (error) {
        return json(res, 400, { error: 'invalid_payload', detail: error.message });
      }
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'stylo-cargas-whatsapp-gateway' });
    }

    return json(res, 404, { error: 'not_found' });
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  createWhatsAppGateway().listen(PORT, () => {
    console.log(`Stylo WhatsApp Gateway en http://localhost:${PORT}`);
  });
}
