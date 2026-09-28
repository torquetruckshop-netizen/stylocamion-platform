const { getOrderByTicketCode, handleError, json, methodNotAllowed, publicOrder } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const code = String(req.query?.code || '').trim().toUpperCase();
    if (!code) return json(res, 400, { ok: false, error: 'Falta código.' });

    const order = await getOrderByTicketCode(code);
    if (!order || order.status !== 'paid') return json(res, 404, { ok: false, error: 'Código no encontrado o no pagado.' });

    return json(res, 200, { ok: true, ticket: publicOrder(order) });
  } catch (error) {
    return handleError(res, error);
  }
};