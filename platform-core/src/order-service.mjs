import { randomUUID } from 'node:crypto';
import { requireProduct } from './catalog.mjs';
import { createQrCredential, recoverQrPayload } from './qr.mjs';

const PAYMENT_STATUS = Object.freeze({
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
});

export class OrderService {
  constructor({ store, paymentClient, publicBaseUrl, qrEncryptionSecret = 'local-development-only', clock = () => new Date() }) {
    this.store = store;
    this.paymentClient = paymentClient;
    this.publicBaseUrl = publicBaseUrl;
    this.qrEncryptionSecret = qrEncryptionSecret;
    this.clock = clock;
  }

  async createOrder({ userId, sku, termsVersion, payer, metadata = {} }) {
    if (!userId) throw new Error('USER_REQUIRED');
    if (!termsVersion) throw new Error('TERMS_VERSION_REQUIRED');
    const product = requireProduct(sku);
    const now = this.clock();
    const order = {
      id: randomUUID(),
      userId,
      sku,
      amount: product.amount,
      currency: product.currency,
      status: product.amount === 0 ? 'approved' : 'pending',
      termsVersion,
      termsAcceptedAt: now.toISOString(),
      payer,
      metadata,
      provider: product.amount === 0 ? 'free' : 'mercadopago',
      providerPaymentId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.store.createOrder(order);
    if (order.status === 'approved') return this.activate(order, product);
    return { order };
  }

  async createCheckout(orderId) {
    const order = await this.requireOrder(orderId);
    if (order.status !== 'pending') throw new Error('ORDER_NOT_PAYABLE');
    const product = requireProduct(order.sku);
    const base = this.publicBaseUrl.replace(/\/$/, '');
    const preference = await this.paymentClient.createPreference({
      order,
      product,
      notificationUrl: `${base}/api/webhooks/mercadopago?order=${order.id}`,
      backUrls: {
        success: `${base}/pagos/${order.id}?resultado=aprobado`,
        pending: `${base}/pagos/${order.id}?resultado=pendiente`,
        failure: `${base}/pagos/${order.id}?resultado=rechazado`,
      },
    });
    order.providerPreferenceId = preference.id;
    order.updatedAt = this.clock().toISOString();
    await this.store.saveOrder(order);
    return { order, checkoutUrl: preference.init_point, sandboxUrl: preference.sandbox_init_point };
  }

  async reconcilePayment({ providerEventId, payment }) {
    if (await this.store.hasPaymentEvent(providerEventId)) {
      return { duplicate: true };
    }
    const order = await this.requireOrder(payment.external_reference);
    const product = requireProduct(order.sku);
    if (Number(payment.transaction_amount) !== product.amount) throw new Error('PAYMENT_AMOUNT_MISMATCH');
    if (payment.currency_id !== product.currency) throw new Error('PAYMENT_CURRENCY_MISMATCH');

    const status = PAYMENT_STATUS[payment.status];
    if (!status) throw new Error('PAYMENT_STATUS_UNSUPPORTED');
    if (order.status === 'approved' && status === 'approved') {
      await this.store.recordPaymentEvent(providerEventId);
      return { duplicate: true, order };
    }
    order.status = status;
    order.providerPaymentId = String(payment.id);
    order.updatedAt = this.clock().toISOString();
    await this.store.recordPaymentEvent(providerEventId);
    await this.store.saveOrder(order);

    if (status === 'approved') return this.activate(order, product);
    if (status === 'refunded' || status === 'charged_back') {
      await this.store.revokeOrderBenefits(order.id, this.clock());
    }
    return { order };
  }

  async activate(order, product) {
    const now = this.clock();
    const expiresAt = product.durationMs
      ? new Date(now.getTime() + product.durationMs).toISOString()
      : null;
    const entitlement = await this.store.grantEntitlement({
      id: randomUUID(),
      orderId: order.id,
      userId: order.userId,
      code: product.entitlement,
      status: 'active',
      startsAt: now.toISOString(),
      expiresAt,
    });
    let qr = null;
    if (product.qrKind) {
      qr = createQrCredential({
        orderId: order.id,
        kind: product.qrKind,
        publicBaseUrl: this.publicBaseUrl,
        encryptionSecret: this.qrEncryptionSecret,
        now,
      });
      await this.store.saveQr(qr);
    }
    return { order, entitlement, qr };
  }

  async recoverQr({ orderId, userId }) {
    const order = await this.requireOrder(orderId);
    if (order.userId !== userId) throw new Error('ORDER_FORBIDDEN');
    if (order.status !== 'approved') throw new Error('ORDER_NOT_APPROVED');
    const credential = await this.store.getQrByOrder(orderId);
    if (!credential) throw new Error('QR_NOT_FOUND');
    return {
      id: credential.id,
      kind: credential.kind,
      status: credential.status,
      payload: recoverQrPayload({
        credential,
        publicBaseUrl: this.publicBaseUrl,
        encryptionSecret: this.qrEncryptionSecret,
      }),
    };
  }

  async requireOrder(orderId) {
    const order = await this.store.getOrder(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    return order;
  }
}
