import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectProductionConfig } from '../src/config.mjs';
import { createSetupServer } from '../src/server.mjs';

function validEnv() {
  return {
    PUBLIC_BASE_URL: 'https://cuentas.stylocamion.com',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'publishable-test',
    SUPABASE_SECRET_KEY: 'secret-test',
    MERCADOPAGO_ACCESS_TOKEN: 'app-usertest-token',
    MERCADOPAGO_WEBHOOK_SECRET: 'webhook-secret',
    QR_ENCRYPTION_SECRET: 'q'.repeat(32),
    ADMIN_USER_ID_ALLOWLIST: 'user-admin',
    AUTH_COOKIE_DOMAIN: '.stylocamion.com',
    ACCOUNT_TERMS_VERSION: 'general-2026-08-v1',
  };
}

test('la configuración productiva exige todos los secretos sin exponer sus valores', () => {
  const status = inspectProductionConfig({});
  assert.equal(status.ready, false);
  assert.ok(status.missing.includes('SUPABASE_SECRET_KEY'));
  assert.ok(status.missing.includes('MERCADOPAGO_ACCESS_TOKEN'));
  assert.ok(status.missing.includes('QR_ENCRYPTION_SECRET'));
});

test('acepta las claves compatibles de Supabase y valida URL, dominio y secreto QR', () => {
  const env = validEnv();
  delete env.SUPABASE_PUBLISHABLE_KEY;
  delete env.SUPABASE_SECRET_KEY;
  env.SUPABASE_ANON_KEY = 'anon-test';
  env.SUPABASE_SERVICE_ROLE_KEY = 'role-test';
  assert.deepEqual(inspectProductionConfig(env), { ready: true, missing: [], invalid: [] });

  env.PUBLIC_BASE_URL = 'http://cuentas.stylocamion.com';
  env.AUTH_COOKIE_DOMAIN = 'stylocamion.com';
  env.QR_ENCRYPTION_SECRET = 'short';
  const invalid = inspectProductionConfig(env);
  assert.equal(invalid.ready, false);
  assert.deepEqual(invalid.invalid.sort(), ['AUTH_COOKIE_DOMAIN', 'PUBLIC_BASE_URL', 'QR_ENCRYPTION_SECRET']);
});

test('el modo de configuración evita el 502 y no habilita operaciones', async (t) => {
  const server = createSetupServer({ configurationStatus: inspectProductionConfig({}) });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true, ready: false, mode: 'setup', service: 'stylo-platform-core',
  });
  assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  const home = await fetch(base);
  assert.equal(home.status, 503);
  assert.match(await home.text(), /Estamos preparando tu cuenta/);
  assert.equal((await fetch(`${base}/api/orders`, { method: 'POST' })).status, 503);
});
