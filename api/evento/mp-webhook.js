const { approveOrderFromPayment, fetchMercadoPagoPayment, handleError, json, methodNotAllowed, readJson } = require('./_lib');

function getPaymentId(req, body) {
  const query = req.query || {};
  return query['data.id'] || query.id || query.payment_id || body?.data?.id || body?.id || body?.payment_id || null;
}

module.exports = async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return methodNotAllowed(res, ['POST', 'GET']);
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    const paymentId = getPaymentId(req, body);
    if (!paymentId) return json(res, 200, { ok: true, ignored: true, reason: 'Sin payment_id.' });

    const payment = await fetchMercadoPagoPayment(paymentId);
    const order = await approveOrderFromPayment(payment, req);
    return json(res, 200, { ok: true, order_id: order.id, status: order.status, ticket_code: order.ticket_code });
  } catch (error) {
    return handleError(res, error);
  }
};