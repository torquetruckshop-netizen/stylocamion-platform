const { getOrderById, handleError, json, methodNotAllowed } = require('../evento/_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const order = await getOrderById(req.query?.order_id);
    if (!order || order.event_slug !== 'stylo-desarrollo-web') {
      return json(res, 404, { ok: false, error: 'Orden no encontrada.' });
    }
    return json(res, 200, {
      ok: true,
      order: {
        id: order.id,
        status: order.status,
        product_name: order.product_name,
        amount: Number(order.amount),
        currency: order.currency || 'ARS',
        buyer_name: order.buyer_name,
        created_at: order.created_at
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};