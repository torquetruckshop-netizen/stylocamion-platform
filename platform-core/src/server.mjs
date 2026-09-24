import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { AdminService } from './admin-service.mjs';
import { AccountService } from './account-service.mjs';
import { PlatformAuth, SupabaseAuth } from './auth.mjs';
import { MemoryStore } from './memory-store.mjs';
import { SupabaseStore } from './supabase-store.mjs';
import { MercadoPagoClient } from './mercadopago.mjs';
import { OrderService } from './order-service.mjs';
import { PRODUCTS } from './catalog.mjs';
import { inspectProductionConfig } from './config.mjs';

export function createPlatformServer({
  auth, accountService, orderService, adminService, paymentClient,
  publicConfig = {}, sessionCookie = {}, staticDir = null,
  readinessCheck = async () => ({ ok: true }),
}) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, ready: true, mode: 'operational', service: 'stylo-platform-core' });
      }

      if (req.method === 'GET' && url.pathname === '/health/ready') {
        try {
          await readinessCheck();
          return json(res, 200, { ready: true, service: 'stylo-platform-core' });
        } catch (error) {
          console.error('[readiness]', error.message);
          return json(res, 503, { ready: false, service: 'stylo-platform-core' });
        }
      }

      if (req.method === 'GET' && url.pathname === '/api/public-config') {
        return json(res, 200, publicConfig);
      }

      if (req.method === 'POST' && url.pathname === '/api/analytics/pageview') {
        const input = await readJson(req);
        const path = typeof input.path === 'string' && input.path.startsWith('/') ? input.path.slice(0, 200) : '/';
        const sessionId = typeof input.sessionId === 'string' && /^[a-f0-9-]{16,64}$/i.test(input.sessionId) ? input.sessionId : null;
        const referrerHost = typeof input.referrerHost === 'string' ? input.referrerHost.slice(0, 120) : null;
        if (!sessionId) throw new Error('ANALYTICS_SESSION_INVALID');
        if (typeof adminService.store.recordPageview === 'function') {
          await adminService.store.recordPageview({ sessionId, path, referrerHost, createdAt: new Date().toISOString() });
        }
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        return res.end();
      }

      if (req.method === 'GET' && url.pathname === '/api/products') {
        return json(res, 200, Object.values(PRODUCTS)
          .filter((product) => product.enabled && product.amount !== null)
          .map(({ durationMs, ...product }) => ({
            ...product,
            durationDays: durationMs ? Math.round(durationMs / 86400000) : null,
          })));
      }

      if (req.method === 'POST' && url.pathname === '/api/session') {
        if (typeof auth.createSession !== 'function') throw new Error('SESSION_NOT_AVAILABLE');
        const session = await auth.createSession(toRequest(req));
        return json(res, 201, { user: session.user, expiresAt: session.expiresAt.toISOString() }, {
          'Set-Cookie': sessionCookieHeader({ ...sessionCookie, token: session.token, expiresAt: session.expiresAt }),
        });
      }

      if (req.method === 'DELETE' && url.pathname === '/api/session') {
        if (typeof auth.revokeSession === 'function') await auth.revokeSession(toRequest(req));
        return json(res, 200, { signedOut: true }, {
          'Set-Cookie': clearSessionCookieHeader(sessionCookie),
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/account/bootstrap') {
        const user = await auth.authenticate(toRequest(req));
        const input = await readJson(req);
        return json(res, 201, await accountService.bootstrap({ ...input, user }));
      }

      if (req.method === 'GET' && url.pathname === '/api/account') {
        const user = await auth.authenticate(toRequest(req));
        return json(res, 200, await accountService.summary(user.id));
      }

      if (req.method === 'POST' && url.pathname === '/api/orders') {
        const user = await auth.authenticate(toRequest(req));
        const input = await readJson(req);
        return json(res, 201, await orderService.createOrder({ ...input, userId: user.id }));
      }

      const checkout = url.pathname.match(/^\/api\/orders\/([^/]+)\/checkout$/);
      if (req.method === 'POST' && checkout) {
        const user = await auth.authenticate(toRequest(req));
        const order = await orderService.requireOrder(checkout[1]);
        if (order.userId !== user.id) throw new Error('ORDER_FORBIDDEN');
        return json(res, 200, await orderService.createCheckout(order.id));
      }

      const qrRecovery = url.pathname.match(/^\/api\/orders\/([^/]+)\/qr$/);
      if (req.method === 'GET' && qrRecovery) {
        const user = await auth.authenticate(toRequest(req));
        return json(res, 200, await orderService.recoverQr({ orderId: qrRecovery[1], userId: user.id }));
      }

      const qrsRecovery = url.pathname.match(/^\/api\/orders\/([^/]+)\/qrs$/);
      if (req.method === 'GET' && qrsRecovery) {
        const user = await auth.authenticate(toRequest(req));
        return json(res, 200, await orderService.recoverQrs({ orderId: qrsRecovery[1], userId: user.id }));
      }

      const qrImage = url.pathname.match(/^\/api\/orders\/([^/]+)\/qr\.svg$/);
      if (req.method === 'GET' && qrImage) {
        const user = await auth.authenticate(toRequest(req));
        const credentials = await orderService.recoverQrs({ orderId: qrImage[1], userId: user.id });
        const credential = url.searchParams.get('qr')
          ? credentials.find((item) => item.id === url.searchParams.get('qr'))
          : credentials[0];
        if (!credential) throw new Error('QR_NOT_FOUND');
        const svg = await QRCode.toString(credential.payload, {
          type: 'svg', width: 360, margin: 2,
          color: { dark: '#111111ff', light: '#ffffffff' },
        });
        return textResponse(res, 200, svg, 'image/svg+xml; charset=utf-8');
      }

      if (req.method === 'POST' && url.pathname === '/api/webhooks/mercadopago') {
        const body = await readJson(req);
        const dataId = url.searchParams.get('data.id') ?? body?.data?.id;
        paymentClient.validateWebhook({
          xSignature: req.headers['x-signature'],
          xRequestId: req.headers['x-request-id'],
          dataId,
        });
        const payment = await paymentClient.getPayment(dataId);
        const providerEventId = `${body.action ?? 'payment.updated'}:${payment.id}:${payment.status}`;
        const result = await orderService.reconcilePayment({ providerEventId, payment });
        return json(res, 200, { received: true, duplicate: result.duplicate ?? false });
      }

      if (req.method === 'GET' && url.pathname === '/api/admin/snapshot') {
        const actor = await auth.authenticate(toRequest(req));
        return json(res, 200, await adminService.snapshot(actor.id));
      }

      if (req.method === 'POST' && url.pathname === '/api/admin/qr/redeem') {
        const actor = await auth.authenticate(toRequest(req));
        const { token } = await readJson(req);
        return json(res, 200, await adminService.redeemQr({ actorId: actor.id, token }));
      }

      if (req.method === 'GET' && staticDir) {
        const asset = staticAsset(url.pathname);
        if (asset) return serveFile(res, new URL(asset.file, staticDir), asset.type);
      }

      return json(res, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      return json(res, statusFor(error.message), { error: error.message });
    }
  });
}

export function createSetupServer({ configurationStatus }) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        ok: true,
        ready: false,
        mode: 'setup',
        service: 'stylo-platform-core',
      });
    }
    if (req.method === 'GET' && url.pathname === '/health/ready') {
      return json(res, 503, { ready: false, mode: 'setup', service: 'stylo-platform-core' });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      return textResponse(res, 503, setupHtml(), 'text/html; charset=utf-8');
    }
    return json(res, 503, { error: 'SERVICE_CONFIGURATION_PENDING' });
  }).on('listening', () => {
    const missing = configurationStatus.missing.join(',') || 'none';
    const invalid = configurationStatus.invalid.join(',') || 'none';
    console.error(`[startup] setup mode; missing=${missing}; invalid=${invalid}`);
  });
}

async function serveFile(res, fileUrl, contentType) {
  try {
    const data = await readFile(fileUrl);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      'Cache-Control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'",
    });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') return json(res, 404, { error: 'NOT_FOUND' });
    throw error;
  }
}

function staticAsset(pathname) {
  if (pathname === '/' || pathname === '/admin' || pathname.startsWith('/validar/')) {
    return { file: 'index.html', type: 'text/html; charset=utf-8' };
  }
  if (pathname === '/app.js') return { file: 'app.js', type: 'text/javascript; charset=utf-8' };
  if (pathname === '/styles.css') return { file: 'styles.css', type: 'text/css; charset=utf-8' };
  return null;
}

function statusFor(code) {
  if (/AUTH_REQUIRED|AUTH_INVALID/.test(code)) return 401;
  if (/ADMIN_REQUIRED|FORBIDDEN/.test(code)) return 403;
  if (/NOT_FOUND/.test(code)) return 404;
  if (/INVALID_WEBHOOK|TIMESTAMP/.test(code)) return 401;
  if (/MISMATCH/.test(code)) return 409;
  return 400;
}

function json(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(data);
}

function textResponse(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function setupHtml() {
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stylo Camión · Configuración en curso</title><style>
body{margin:0;background:#0b0c0e;color:#fff;font:18px/1.45 system-ui,sans-serif}main{max-width:720px;margin:14vh auto;padding:36px}
.mark{color:#f36c21;font-weight:800;letter-spacing:.08em}h1{font-size:clamp(36px,8vw,68px);line-height:.95;margin:.5em 0}
p{color:#c7c9cd;max-width:580px}.bar{width:84px;height:6px;background:#f36c21;margin-top:32px}
</style></head><body><main><div class="mark">STYLO CAMIÓN</div><h1>Estamos preparando tu cuenta.</h1>
<p>El acceso único, los pagos y los QR se encuentran en configuración segura. Volvé a intentar en unos minutos.</p><div class="bar"></div></main></body></html>`;
}

function sessionCookieHeader({ token, expiresAt, name = 'stylo-platform-auth', domain = '.stylocamion.com' }) {
  return [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/', `Domain=${domain}`, 'HttpOnly', 'Secure', 'SameSite=Lax',
    `Expires=${expiresAt.toUTCString()}`,
  ].join('; ');
}

function clearSessionCookieHeader({ name = 'stylo-platform-auth', domain = '.stylocamion.com' } = {}) {
  return [
    `${name}=`, 'Path=/', `Domain=${domain}`, 'HttpOnly', 'Secure', 'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ].join('; ');
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function toRequest(req) {
  return new Request('http://localhost', { headers: req.headers });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const production = process.env.NODE_ENV === 'production';
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 8787);
  const configurationStatus = production
    ? inspectProductionConfig(process.env)
    : { ready: true, missing: [], invalid: [] };

  if (!configurationStatus.ready) {
    const setupServer = createSetupServer({ configurationStatus });
    setupServer.listen(port, host);
  } else {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAuthKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const store = production
    ? new SupabaseStore({ supabaseUrl, secretKey: supabaseSecretKey })
    : new MemoryStore();
  const paymentClient = new MercadoPagoClient({
    accessToken: production ? process.env.MERCADOPAGO_ACCESS_TOKEN : process.env.MERCADOPAGO_ACCESS_TOKEN ?? 'local-test-token',
    webhookSecret: production ? process.env.MERCADOPAGO_WEBHOOK_SECRET : process.env.MERCADOPAGO_WEBHOOK_SECRET ?? 'local-test-secret',
  });
  const supabaseAuth = new SupabaseAuth({
    supabaseUrl,
    anonKey: supabaseAuthKey,
  });
  const cookieName = process.env.AUTH_COOKIE_NAME ?? 'stylo-platform-auth';
  const auth = production
    ? new PlatformAuth({ supabaseAuth, store, cookieName, sessionDays: 30 })
    : supabaseAuth;
  const admins = new Set(String(process.env.ADMIN_USER_ID_ALLOWLIST ?? '').split(',').filter(Boolean));
  const orderService = new OrderService({
    store,
    paymentClient,
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:8787',
    qrEncryptionSecret: process.env.QR_ENCRYPTION_SECRET ?? 'local-development-only',
  });
  const server = createPlatformServer({
    auth,
    accountService: new AccountService({ store }),
    orderService,
    paymentClient,
    adminService: new AdminService({ store, adminIds: admins }),
    publicConfig: {
      supabaseUrl,
      supabasePublishableKey: supabaseAuthKey,
      accountTermsVersion: process.env.ACCOUNT_TERMS_VERSION ?? 'general-2026-08-v1',
    },
    sessionCookie: {
      name: cookieName,
      domain: process.env.AUTH_COOKIE_DOMAIN ?? '.stylocamion.com',
    },
    staticDir: new URL('../public/', import.meta.url),
    readinessCheck: async () => store.healthCheck?.() ?? { ok: true },
  });
  server.listen(port, host, () => {
    console.log(`[startup] operational mode listening on ${host}:${port}`);
  });
  }
}
