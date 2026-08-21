import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountService } from '../src/account-service.mjs';
import { AdminService } from '../src/admin-service.mjs';
import { StaticAuth } from '../src/auth.mjs';
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

  const forbidden = await fetch(`${base}/api/admin/snapshot`, {
    headers: { Authorization: 'Bearer user-token' },
  });
  assert.equal(forbidden.status, 403);

  const admin = await fetch(`${base}/api/admin/snapshot`, {
    headers: { Authorization: 'Bearer admin-token' },
  });
  assert.equal(admin.status, 200);
});
