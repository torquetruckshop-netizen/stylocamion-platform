const {
  argentinaDateString,
  assertValidatorPin,
  getAcceptedCheckinsForDate,
  getOrderByTicketCode,
  handleError,
  insertAccessLog,
  json,
  methodNotAllowed,
  readJson,
  updateOrder,
  validatorView,
} = require('./_lib');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);

  try {
    const body = req.method === 'POST' ? await readJson(req) : {};
    assertValidatorPin(req, body);

    const code = String(body.code || req.query?.code || '').trim().toUpperCase();
    const action = String(body.action || req.query?.action || 'lookup').trim();
    const validator = String(body.validator || req.query?.validator || 'acceso').trim().slice(0, 80);
    const eventDate = argentinaDateString();

    if (!code) return json(res, 400, { ok: false, error: 'Falta código.' });

    let order = await getOrderByTicketCode(code);

    if (!order) {
      await insertAccessLog({ ticket_code: code, action, validator, result: 'not_found' });
      return json(res, 404, { ok: false, status: 'not_found', error: 'Código inexistente.' });
    }

    if (order.status !== 'paid') {
      await insertAccessLog({ order_id: order.id, ticket_code: code, action, validator, result: 'not_paid' });
      return json(res, 409, {
        ok: false,
        status: 'not_paid',
        error: 'La orden no figura como pagada.',
        ticket: validatorView(order),
      });
    }

    const todayCheckins = await getAcceptedCheckinsForDate(code, eventDate);
    const alreadyCheckedInToday = todayCheckins.length > 0;

    if (req.method === 'GET' || action === 'lookup') {
      await insertAccessLog({
        order_id: order.id,
        ticket_code: code,
        action: 'lookup',
        validator,
        result: alreadyCheckedInToday ? 'already_today' : 'ok',
        details: { event_date: eventDate, today_checkins: todayCheckins.length },
      });
      return json(res, 200, {
        ok: true,
        status: alreadyCheckedInToday ? 'already_checked_in_today' : 'valid_for_event',
        message: alreadyCheckedInToday
          ? 'Este código ya registró ingreso hoy. Vuelve a quedar habilitado mañana.'
          : 'Código pagado. Habilitado para 1 ingreso por día durante los 4 días del evento.',
        daily: { event_date: eventDate, already_checked_in_today: alreadyCheckedInToday, today_checkins: todayCheckins.length },
        ticket: validatorView(order),
      });
    }

    if (action === 'checkin') {
      if (alreadyCheckedInToday) {
        await insertAccessLog({
          order_id: order.id,
          ticket_code: code,
          action: 'checkin',
          validator,
          result: 'already_today',
          details: { event_date: eventDate, today_checkins: todayCheckins.length },
        });
        return json(res, 409, {
          ok: false,
          status: 'already_checked_in_today',
          error: 'Este código ya ingresó hoy. Puede volver a ingresar mañana con el mismo código.',
          daily: { event_date: eventDate, already_checked_in_today: true, today_checkins: todayCheckins.length },
          ticket: validatorView(order),
        });
      }

      const checkedInCount = Number(order.checked_in_count || 0) + 1;
      const firstCheckInAt = order.checked_in_at || new Date().toISOString();
      order = await updateOrder(order.id, {
        checked_in_at: firstCheckInAt,
        checked_in_count: checkedInCount,
      });

      await insertAccessLog({
        order_id: order.id,
        ticket_code: code,
        action: 'checkin',
        validator,
        result: 'daily_checkin_ok',
        details: { event_date: eventDate, checked_in_count: checkedInCount },
      });

      return json(res, 200, {
        ok: true,
        status: checkedInCount === 1 ? 'checked_in' : 'daily_checkin_registered',
        message: checkedInCount === 1
          ? 'Ingreso registrado para hoy. El código vuelve a habilitarse mañana.'
          : 'Ingreso del día registrado. El código sigue vigente para los próximos días del evento.',
        daily: { event_date: eventDate, already_checked_in_today: true, today_checkins: 1 },
        ticket: validatorView(order),
      });
    }

    if (action === 'deliver_box') {
      if (order.box_delivered_at) {
        await insertAccessLog({ order_id: order.id, ticket_code: code, action: 'deliver_box', validator, result: 'already_delivered' });
        return json(res, 409, {
          ok: false,
          status: 'already_delivered',
          error: 'La Caja Ruta ya fue entregada.',
          ticket: validatorView(order),
        });
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
