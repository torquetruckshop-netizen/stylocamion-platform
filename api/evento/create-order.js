const { PRODUCTS, createMercadoPagoPreference, getBaseUrl, handleError, insertOrder, json, methodNotAllowed, normalizePhone, normalizePlate, readJson, sanitizeText, updateOrder } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const body = await readJson(req);
    const product = PRODUCTS[body.product_code];
    if (!product) return json(res, 400, { ok: false, error: 'Producto inválido.' });

    const buyerName = sanitizeText(body.buyer_name, 100);
    const buyerPhone = normalizePhone(body.buyer_phone);
    const buyerEmail = sanitizeText(body.buyer_email, 160).toLowerCase();
    const vehicleType = sanitizeText(body.vehicle_type || '', 40);
    const vehiclePlate = normalizePlate(body.vehicle_plate || '');

    if (!buyerName) return json(res, 400, { ok: false, error: 'Ingresá nombre y apellido.' });
    if (buyerPhone.length < 8) return json(res, 400, { ok: false, error: 'Ingresá un WhatsApp válido.' });
    if (product.requiresVehicle && !vehiclePlate) return json(res, 400, { ok: false, error: 'Ingresá la patente o identificación del vehículo.' });

    const order = await insertOrder({
      event_slug: 'feria-usado-con-ruedas-2027',
      status: 'pending',
      product_code: product.code,
      product_name: product.name,
      amount: product.amount,
      currency: 'ARS',
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail || null,
      buyer_document: sanitizeText(body.buyer_document, 40) || null,
      vehicle_type: vehicleType || null,
      vehicle_plate: vehiclePlate || null,
      quantity: 1,
      source: 'web',
      notes: sanitizeText(body.notes, 280) || null
    });

    const preference = await createMercadoPagoPreference({ order, product, baseUrl: getBaseUrl(req) });
    const updated = await updateOrder(order.id, { mp_preference_id: preference.id, mp_init_point: preference.init_point, mp_sandbox_init_point: preference.sandbox_init_point });

    return json(res, 200, { ok: true, order_id: updated.id, status: updated.status, product: { code: product.code, name: product.name, amount: product.amount }, checkout_url: preference.init_point, sandbox_checkout_url: preference.sandbox_init_point });
  } catch (error) {
    return handleError(res, error);
  }
};