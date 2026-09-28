const { assertValidatorPin, getOrderByTicketCode, handleError, insertAccessLog, json, methodNotAllowed, readJson, updateOrder, validatorView } = require('./_lib');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    assertValidatorPin(req, body);

    const code = String(body.code || req.query?.code || '').trim().toUpperCase();
    const action = String(body.action || req.query?.action || 'lookup').trim();
    const validator = String(body.validator || req.query?.validator || 'acceso').trim().slice(0, 80);
    if (!code) return json(res, 400, { ok: false, error: 'Falta código.' });

    let order = await getOrderByTicketCode(code);
    if (!order) {
      await insertAccessLog({ ticket_code: code, action, validator, result: 'not_found' });
      return json(res, 404, { ok: false, status: 'not_found', error: 'Código inexistente.' });
    }
    if (order.status !== 'paid') {
      await insertAccessLog({ order_id: order.id, ticket_code: code, action, validator, result: 'not_paid' });
      return json(res, 409, { ok: false, status: 'not_paid', error: 'La orden no figura como pagada.', ticket: validatorView(order) });
    }
    if (req.method === 'GET' || action === 'lookup') {
      await insertAccessLog({ order_id: order.id, ticket_code: code, action: 'lookup', validator, result: 'ok' });
      return json(res, 200, { ok: true, status: order.checked_in_at ? 'already_checked_in' : 'valid', ticket: validatorView(order) });
    }
    if (action === 'checkin') {
      const checkedInCount = Number(order.checked_in_count || 0) + 1;
      order = await updateOrder(order.id, { checked_in_at: order.checked_in_at || new Date().toISOString(), checked_in_count: checkedInCount });
      await insertAccessLog({ order_id: order.id, ticket_code: code, action: 'checkin', validator, result: checkedInCount > 1 ? 'repeat' : 'ok' });
      return json(res, 200, { ok: true, status: checkedInCount > 1 ? 'repeat_checkin' : 'checked_in', ticket: validatorView(order) });
    }
    if (action === 'deliver_box') {
      if (order.box_delivered_at) {
        await insertAccessLog({ order_id: order.id, ticket_code: code, action: 'deliver_box', validator, result: 'already_delivered' });
        return json(res, 409, { ok: false, status: 'already_delivered', error: 'La Caja Ruta ya fue entregada.', ticket: validatorView(order) });
      }
      order = await updateOrder(order.id, { box_delivered_at: new Date().toISOString() });
      await insertAccessLog({ order_id: order.id, ticket_code: code, action: 'deliver_box', validator, result: 'ok' });
      return json(res, 200, { ok: true, status: 'box_delivered', ticket: validatorView(order) });
    }
    return json(res, 400, { ok: false, error: 'Acción inválida.' });
  } catch (error) {
    return handleError(res, error);
  }
};