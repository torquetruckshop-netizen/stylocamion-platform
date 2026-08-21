import { createServer } from 'node:http';
import { AdminService } from './admin-service.mjs';
import { AccountService } from './account-service.mjs';
import { SupabaseAuth } from './auth.mjs';
import { MemoryStore } from './memory-store.mjs';
import { MercadoPagoClient } from './mercadopago.mjs';
import { OrderService } from './order-service.mjs';

export function createPlatformServer({ auth, accountService, orderService, adminService, paymentClient }) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, { ok: true, service: 'stylo-platform-core' });
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

      return json(res, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      return json(res, statusFor(error.message), { error: error.message });
    }
  });
}

function statusFor(code) {
  if (/AUTH_REQUIRED|AUTH_INVALID/.test(code)) return 401;
  if (/ADMIN_REQUIRED|FORBIDDEN/.test(code)) return 403;
  if (/NOT_FOUND/.test(code)) return 404;
  if (/INVALID_WEBHOOK|TIMESTAMP/.test(code)) return 401;
  if (/MISMATCH/.test(code)) return 409;
  return 400;
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
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
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production requires the Supabase store; memory storage is disabled.');
  }
  const store = new MemoryStore();
  const paymentClient = new MercadoPagoClient({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? 'local-test-token',
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? 'local-test-secret',
  });
  const auth = new SupabaseAuth({
    supabaseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  });
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
  });
  server.listen(Number(process.env.PORT ?? 8787));
}
