import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountService } from '../src/account-service.mjs';
import { AdminService } from '../src/admin-service.mjs';
import { PlatformAuth, StaticAuth } from '../src/auth.mjs';
import { MemoryStore } from '../src/memory-store.mjs';
import { OrderService } from '../src/order-service.mjs';
import { createPlatformServer } from '../src/server.mjs';

test('API comparte una cuenta y protege el panel administrativo', async (t) => {
  const store = new MemoryStore();
  const auth = new StaticAuth(new Map([
    ['user-token', { id: 'user-1', phone: '+5493430000000' }],
    ['admin-token', { id: 'admin-1', phone: '+5493431111111' }],
  ]));
  const paymentClient = {
    createPreference: async () => ({ id: 'pref-1', init_point: 'https://mp.test' }),
    validateWebhook: () => {},
    getPayment: async () => { throw new Error('NOT_USED'); },
  };
  const orderService = new OrderService({
    store,
    paymentClient,
    publicBaseUrl: 'https://cuentas.stylocamion.com',
    qrEncryptionSecret: 'test-secret',
  });
  const server = createPlatformServer({
    auth,
    paymentClient,
    orderService,
    accountService: new AccountService({ store }),
    adminService: new AdminService({ store, adminIds: new Set(['admin-1']) }),
    staticDir: new URL('../public/', import.meta.url),
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const account = await fetch(`${base}/api/account/bootstrap`, {
    method: 'POST',
    headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles: ['seller', 'driver'], termsVersion: 'general-v1' }),
  });
  assert.equal(account.status, 201);
  assert.deepEqual((await account.json()).roles, ['seller', 'driver']);

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /Tu acceso a Stylo Camión/);

  const freeQrOrder = await fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: 'feria_person_minor', termsVersion: 'general-v1' }),
  });
  const freeQr = await freeQrOrder.json();
  const qrImage = await fetch(`${base}/api/orders/${freeQr.order.id}/qr.svg`, {
    headers: { Authorization: 'Bearer user-token' },
  });
  assert.equal(qrImage.status, 200);
  assert.match(qrImage.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await qrImage.text(), /<svg/);

  const forbidden = await fetch(`${base}/api/admin/snapshot`, {
    headers: { Authorization: 'Bearer user-token' },
  });
  assert.equal(forbidden.status, 403);

  const admin = await fetch(`${base}/api/admin/snapshot`, {
    headers: { Authorization: 'Bearer admin-token' },
  });
  assert.equal(admin.status, 200);
});

test('la sesión unificada emite una cookie segura para todos los subdominios', async (t) => {
  const store = new MemoryStore();
  const auth = new PlatformAuth({
    store,
    supabaseAuth: {
      authenticate: async () => ({ id: 'user-cookie', phone: '+5493430000000', metadata: {} }),
    },
    clock: () => new Date('2026-08-21T12:00:00Z'),
  });
  const paymentClient = {
    createPreference: async () => ({ id: 'pref', init_point: 'https://mp.test' }),
    validateWebhook: () => {}, getPayment: async () => { throw new Error('NOT_USED'); },
  };
  const server = createPlatformServer({
    auth, paymentClient,
    orderService: new OrderService({ store, paymentClient, publicBaseUrl: 'https://cuentas.stylocamion.com' }),
    accountService: new AccountService({ store }),
    adminService: new AdminService({ store }),
    sessionCookie: { name: 'stylo-platform-auth', domain: '.stylocamion.com' },
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const created = await fetch(`http://127.0.0.1:${port}/api/session`, {
    method: 'POST', headers: { Authorization: 'Bearer supabase-token' },
  });
  assert.equal(created.status, 201);
  const cookie = created.headers.get('set-cookie');
  assert.match(cookie, /Domain=\.stylocamion\.com/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(await created.text(), /stylo-platform-auth=/);

  const summaryRequest = new Request('https://cuentas.stylocamion.com/api/account', {
    headers: { Cookie: cookie.split(';')[0] },
  });
  assert.equal((await auth.authenticate(summaryRequest)).id, 'user-cookie');
});
