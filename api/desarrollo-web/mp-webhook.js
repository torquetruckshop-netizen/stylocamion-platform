const {
  fetchMercadoPagoPayment, getOrderById, handleError, json, methodNotAllowed,
  readJson, updateOrder
} = require('../evento/_lib');

function getPaymentId(req, body) {
  const query = req.query || {};
  return query['data.id'] || query.id || query.payment_id || body?.data?.id || body?.id || body?.payment_id || null;
}

function mapPaymentStatus(status) {
  if (status === 'approved') return 'paid';
  if (['cancelled', 'refunded', 'charged_back'].includes(status)) return 'cancelled';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

module.exports = async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return methodNotAllowed(res, ['POST', 'GET']);
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const paymentId = getPaymentId(req, body);
    if (!paymentId) return json(res, 200, { ok: true, ignored: true, reason: 'Sin payment_id.' });

    const payment = await fetchMercadoPagoPayment(paymentId);
    const orderId = payment.external_reference || payment.metadata?.order_id;
    if (!orderId) return json(res, 200, { ok: true, ignored: true, reason: 'Sin external_reference.' });

    const order = await getOrderById(orderId);
    if (!order || order.event_slug !== 'stylo-desarrollo-web') {
      return json(res, 200, { ok: true, ignored: true, reason: 'Orden no correspondiente a Desarrollo Web.' });
    }

    const paidAmount = Number(payment.transaction_amount || 0);
    const expectedAmount = Number(order.amount || 0);
    if (payment.status === 'approved' && Math.round(paidAmount * 100) !== Math.round(expectedAmount * 100)) {
      const e = new Error('El monto aprobado no coincide con la orden.');
      e.statusCode = 409;
      throw e;
    }

    const status = mapPaymentStatus(payment.status);
    const updated = await updateOrder(order.id, {
      status,
      mp_payment_id: String(payment.id),
      mp_status: payment.status,
      mp_raw: payment,
      paid_at: status === 'paid' ? (order.paid_at || new Date().toISOString()) : order.paid_at
    });

    return json(res, 200, { ok: true, order_id: updated.id, status: updated.status });
  } catch (error) {
    return handleError(res, error);
  }
};