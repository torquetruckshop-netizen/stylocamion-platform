import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseStore } from '../src/supabase-store.mjs';

function response(status, body = '') {
  return new Response(body === '' ? null : JSON.stringify(body), {
    status,
    headers: body === '' ? {} : { 'Content-Type': 'application/json' },
  });
}

test('SupabaseStore usa la clave secreta sólo en cabeceras del backend', async () => {
  const calls = [];
  const store = new SupabaseStore({
    supabaseUrl: 'https://project.supabase.co',
    secretKey: 'sb_secret_test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(201, [{
        user_id: 'user-1', phone_e164: '+5493430000000', display_name: 'Stylo',
        country_code: 'AR', accepted_general_terms_version: 'v1',
        accepted_general_terms_at: '2026-08-21T12:00:00Z', created_at: '2026-08-21T12:00:00Z',
        updated_at: '2026-08-21T12:00:00Z',
      }]);
    },
  });
  const saved = await store.upsertProfile({
    userId: 'user-1', phone: '+5493430000000', displayName: 'Stylo', countryCode: 'AR',
    termsVersion: 'v1', termsAcceptedAt: '2026-08-21T12:00:00Z', updatedAt: '2026-08-21T12:00:00Z',
  });
  assert.equal(saved.userId, 'user-1');
  assert.equal(calls[0].options.headers.apikey, 'sb_secret_test');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer sb_secret_test');
  assert.doesNotMatch(calls[0].url, /sb_secret_test/);
});

test('SupabaseStore registra webhooks de forma idempotente con restricción única', async () => {
  let attempt = 0;
  const store = new SupabaseStore({
    supabaseUrl: 'https://project.supabase.co', secretKey: 'secret',
    fetchImpl: async (_url, options) => {
      attempt += 1;
      assert.match(options.headers.Prefer, /resolution=ignore-duplicates/);
      return response(201, attempt === 1 ? [{ provider_event_id: 'payment:1' }] : []);
    },
  });
  assert.equal(await store.recordPaymentEvent('payment:1', {
    orderId: 'order-1', payment: { id: 1, status: 'approved' },
  }), true);
  assert.equal(await store.recordPaymentEvent('payment:1', {
    orderId: 'order-1', payment: { id: 1, status: 'approved' },
  }), false);
});

test('SupabaseStore canjea un QR con una actualización condicionada a valid', async () => {
  const calls = [];
  const store = new SupabaseStore({
    supabaseUrl: 'https://project.supabase.co', secretKey: 'secret',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(200, [{
        id: 'qr-1', order_id: 'order-1', user_id: 'user-1', kind: 'person',
        token_hash: 'hash', token_ciphertext: 'cipher', status: 'used',
        issued_at: '2026-08-21T12:00:00Z', used_at: '2026-08-21T12:01:00Z',
        used_by: 'admin-1', revoked_at: null,
      }]);
    },
  });
  const result = await store.redeemQr('hash', 'admin-1', new Date('2026-08-21T12:01:00Z'));
  assert.equal(result.ok, true);
  assert.match(calls[0].url, /status=eq\.valid/);
  assert.equal(JSON.parse(calls[0].options.body).status, 'used');
});
