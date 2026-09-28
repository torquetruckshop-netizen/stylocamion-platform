const { approveOrderFromPayment, fetchMercadoPagoPayment, getOrderById, handleError, json, methodNotAllowed, publicOrder } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const query = req.query || {};
    const orderId = query.order_id || query.id || query.external_reference;
    const paymentId = query.payment_id || query.collection_id;
    if (!orderId) return json(res, 400, { ok: false, error: 'Falta order_id.' });

    let order = await getOrderById(orderId);
    if (!order) return json(res, 404, { ok: false, error: 'Orden no encontrada.' });

    if (paymentId && order.status !== 'paid') {
      try {
        const payment = await fetchMercadoPagoPayment(paymentId);
        if (String(payment.external_reference) === String(order.id)) order = await approveOrderFromPayment(payment, req);
      } catch (error) {
        console.error('No se pudo sincronizar pago desde confirmación', error.message);
      }
    }

    return json(res, 200, { ok: true, order: publicOrder(order) });
  } catch (error) {
    return handleError(res, error);
  }
};