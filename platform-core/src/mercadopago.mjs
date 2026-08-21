import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.mercadopago.com';

export class MercadoPagoClient {
  constructor({ accessToken, webhookSecret, fetchImpl = fetch }) {
    if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN_REQUIRED');
    this.accessToken = accessToken;
    this.webhookSecret = webhookSecret;
    this.fetch = fetchImpl;
  }

  async createPreference({ order, product, notificationUrl, backUrls }) {
    const response = await this.fetch(`${API}/checkout/preferences`, {
      method: 'POST',
      headers: this.headers(order.id),
      body: JSON.stringify({
        external_reference: order.id,
        items: [{
          id: product.sku,
          title: product.name,
          quantity: 1,
          currency_id: product.currency,
          unit_price: product.amount,
        }],
        payer: order.payer ?? undefined,
        notification_url: notificationUrl,
        back_urls: backUrls,
        auto_return: 'approved',
        metadata: { order_id: order.id, user_id: order.userId, sku: product.sku },
      }),
    });
    if (!response.ok) throw new Error(`MERCADOPAGO_PREFERENCE_${response.status}`);
    return response.json();
  }

  async getPayment(paymentId) {
    const response = await this.fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error(`MERCADOPAGO_PAYMENT_${response.status}`);
    return response.json();
  }

  validateWebhook({ xSignature, xRequestId, dataId, toleranceSeconds = 300, now = Date.now }) {
    if (!this.webhookSecret) throw new Error('MERCADOPAGO_WEBHOOK_SECRET_REQUIRED');
    validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
      secret: this.webhookSecret,
      toleranceSeconds,
      now,
    });
  }

  headers(idempotencyKey) {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    };
  }
}

export function validateWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
  toleranceSeconds,
  now = Date.now,
}) {
  const fields = Object.fromEntries(
    String(xSignature ?? '').split(',').map((part) => part.trim().split('=', 2)),
  );
  const ts = fields.ts;
  const received = fields.v1;
  if (!ts || !/^\d+$/.test(ts) || !received) throw new Error('INVALID_WEBHOOK_SIGNATURE');

  const manifest = [
    dataId ? `id:${dataId}` : null,
    xRequestId ? `request-id:${xRequestId}` : null,
    `ts:${ts}`,
  ].filter(Boolean).join(';') + ';';
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  if (!safeEqual(expected, received)) throw new Error('INVALID_WEBHOOK_SIGNATURE');

  if (toleranceSeconds !== undefined) {
    const drift = Math.abs(now() - Number(ts) * 1000) / 1000;
    if (drift > toleranceSeconds) throw new Error('WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE');
  }
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
