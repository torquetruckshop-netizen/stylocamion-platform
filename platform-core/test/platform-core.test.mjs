import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { AdminService } from '../src/admin-service.mjs';
import { AccountService } from '../src/account-service.mjs';
import { MemoryStore } from '../src/memory-store.mjs';
import { validateWebhookSignature } from '../src/mercadopago.mjs';
import { OrderService } from '../src/order-service.mjs';

function setup(now = new Date('2026-10-01T12:00:00Z')) {
  const store = new MemoryStore();
  const service = new OrderService({
    store,
    publicBaseUrl: 'https://cuentas.stylocamion.com',
    clock: () => now,
    qrEncryptionSecret: 'test-qr-encryption-secret',
    paymentClient: { createPreference: async () => ({ id: 'pref-1', init_point: 'https://mp.test' }) },
  });
  return { store, service };
}

test('una orden aprobada de Feria emite un QR único', async () => {
  const { store, service } = setup();
  const created = await service.createOrder({
    userId: 'user-1',
    sku: 'feria_vehicle_truck',
    termsVersion: 'feria-2026-10-v1',
  });
  const result = await service.reconcilePayment({
    providerEventId: 'payment:100',
    payment: {
      id: 100,
      external_reference: created.order.id,
      transaction_amount: 35000,
      currency_id: 'ARS',
      status: 'approved',
    },
  });
  assert.equal(result.entitlement.code, 'feria.vehicle.truck');
  assert.match(result.qr.payload, /^https:\/\/cuentas\.stylocamion\.com\/validar\//);
  assert.equal((await store.adminSnapshot()).qr.length, 1);
});

test('el espacio de moto cuesta $15.000 final y emite su QR', async () => {
  const { service } = setup();
  const { order } = await service.createOrder({
    userId: 'motorcycle-1', sku: 'feria_vehicle_motorcycle', termsVersion: 'feria-v1',
  });
  assert.equal(order.amount, 15000);
  const result = await service.reconcilePayment({
    providerEventId: 'payment:motorcycle-1',
    payment: {
      id: 15000,
      external_reference: order.id,
      transaction_amount: 15000,
      currency_id: 'ARS',
      status: 'approved',
    },
  });
  assert.equal(result.qr.kind, 'vehicle_motorcycle');
});

test('un registro habilita la misma cuenta gratuita con múltiples roles', async () => {
  const { store } = setup();
  const accounts = new AccountService({ store });
  const account = await accounts.bootstrap({
    user: { id: 'account-1', phone: '+5493430000000' },
    displayName: 'Usuario Stylo',
    countryCode: 'AR',
    roles: ['seller', 'carrier', 'driver'],
    termsVersion: 'general-v1',
  });
  assert.deepEqual(account.roles, ['seller', 'carrier', 'driver']);
  assert.equal(account.freeAccess.cargas, true);
  assert.equal(account.freeAccess.driversJobSeeker, true);
});

test('un webhook repetido no duplica beneficios ni QR', async () => {
  const { store, service } = setup();
  const { order } = await service.createOrder({
    userId: 'user-2', sku: 'feria_person_adult', termsVersion: 'feria-v1',
  });
  const payment = {
    id: 200,
    external_reference: order.id,
    transaction_amount: 6500,
    currency_id: 'ARS',
    status: 'approved',
  };
  await service.reconcilePayment({ providerEventId: 'payment:200', payment });
  const duplicate = await service.reconcilePayment({ providerEventId: 'payment:200', payment });
  assert.deepEqual(duplicate, { duplicate: true });
  assert.equal((await store.adminSnapshot()).qr.length, 1);
});

test('el QR puede validarse una sola vez', async () => {
  const { store, service } = setup();
  const admin = new AdminService({ store, adminIds: new Set(['francisco']) });
  const result = await service.createOrder({
    userId: 'minor-1', sku: 'feria_person_minor', termsVersion: 'feria-v1',
  });
  const token = result.qr.payload.split('/').at(-1);
  assert.equal((await admin.redeemQr({ actorId: 'francisco', token })).ok, true);
  assert.equal((await admin.redeemQr({ actorId: 'francisco', token })).reason, 'used');
});

test('el propietario puede recuperar su QR desde la misma cuenta', async () => {
  const { service } = setup();
  const result = await service.createOrder({
    userId: 'minor-2', sku: 'feria_person_minor', termsVersion: 'feria-v1',
  });
  const recovered = await service.recoverQr({ orderId: result.order.id, userId: 'minor-2' });
  assert.equal(recovered.payload, result.qr.payload);
  await assert.rejects(
    service.recoverQr({ orderId: result.order.id, userId: 'another-user' }),
    /ORDER_FORBIDDEN/,
  );
});

test('un reintegro revoca el acceso y el QR', async () => {
  const { store, service } = setup();
  const { order } = await service.createOrder({
    userId: 'user-3', sku: 'feria_vehicle_car_pickup', termsVersion: 'feria-v1',
  });
  const base = {
    id: 300,
    external_reference: order.id,
    transaction_amount: 20000,
    currency_id: 'ARS',
  };
  await service.reconcilePayment({ providerEventId: 'payment:300:approved', payment: { ...base, status: 'approved' } });
  await service.reconcilePayment({ providerEventId: 'payment:300:refunded', payment: { ...base, status: 'refunded' } });
  const snapshot = await store.adminSnapshot();
  assert.equal(snapshot.entitlements[0].status, 'revoked');
  assert.equal(snapshot.qr[0].status, 'revoked');
});

test('valida la firma HMAC vigente de Mercado Pago', () => {
  const secret = 'test-secret';
  const ts = '1788264000';
  const dataId = '999';
  const requestId = 'request-1';
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  assert.doesNotThrow(() => validateWebhookSignature({
    xSignature: `ts=${ts},v1=${hash}`,
    xRequestId: requestId,
    dataId,
    secret,
    toleranceSeconds: undefined,
  }));
});

test('rechaza montos modificados en el navegador', async () => {
  const { service } = setup();
  const { order } = await service.createOrder({
    userId: 'user-4', sku: 'sales_featured', termsVersion: 'ventas-v1',
  });
  await assert.rejects(
    service.reconcilePayment({
      providerEventId: 'payment:400',
      payment: {
        id: 400,
        external_reference: order.id,
        transaction_amount: 1,
        currency_id: 'ARS',
        status: 'approved',
      },
    }),
    /PAYMENT_AMOUNT_MISMATCH/,
  );
});
