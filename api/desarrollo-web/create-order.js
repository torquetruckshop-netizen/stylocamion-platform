const {
  getBaseUrl, handleError, insertOrder, json, methodNotAllowed, normalizePhone,
  readJson, sanitizeText, updateOrder
} = require('../evento/_lib');

const PLANS = {
  esencial: { code: 'web_esencial', name: 'Stylo Desarrollo Web — Esencial', amount: 490000, description: 'Sitio profesional, responsive, hasta 5 secciones, WhatsApp, redes y configuración inicial.' },
  profesional: { code: 'web_profesional', name: 'Stylo Desarrollo Web — Profesional', amount: 790000, description: 'Hasta 8 secciones, formularios comerciales, SEO inicial, analítica, redes y dominio.' },
  premium: { code: 'web_premium', name: 'Stylo Desarrollo Web — Premium', amount: 1190000, description: 'Arquitectura personalizada, automatizaciones, integraciones y acompañamiento de lanzamiento.' }
};

function requireToken() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    const e = new Error('Falta configurar MERCADOPAGO_ACCESS_TOKEN.');
    e.statusCode = 500;
    throw e;
  }
}

async function createPreference({ order, plan, baseUrl }) {
  requireToken();
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_reference: order.id,
      notification_url: `${baseUrl}/api/desarrollo-web/mp-webhook`,
      back_urls: {
        success: `${baseUrl}/desarrollo-web/confirmacion.html?order_id=${order.id}`,
        pending: `${baseUrl}/desarrollo-web/confirmacion.html?order_id=${order.id}`,
        failure: `${baseUrl}/desarrollo-web/confirmacion.html?order_id=${order.id}`
      },
      auto_return: 'approved',
      statement_descriptor: 'STYLO WEB',
      items: [{
        id: plan.code,
        title: plan.name,
        description: plan.description,
        quantity: 1,
        unit_price: Number(plan.amount),
        currency_id: 'ARS'
      }],
      payer: {
        name: order.buyer_name,
        phone: { number: order.buyer_phone }
      },
      metadata: {
        service: 'stylo-desarrollo-web',
        plan_code: plan.code
      }
    })
  });
  const data = await response.json();
  if (!response.ok) {
    const e = new Error(data?.message || `No se pudo crear la preferencia de Mercado Pago (${response.status})`);
    e.statusCode = response.status;
    e.data = data;
    throw e;
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const body = await readJson(req);
    const plan = PLANS[body.plan];
    if (!plan) return json(res, 400, { ok: false, error: 'Plan inválido.' });

    const company = sanitizeText(body.empresa, 120);
    const phone = normalizePhone(body.telefono);
    const activity = sanitizeText(body.actividad, 80);
    const location = sanitizeText(body.ubicacion, 120);
    const objective = sanitizeText(body.objetivo, 120);

    if (!company) return json(res, 400, { ok: false, error: 'Ingresá el nombre de la empresa.' });
    if (phone.length < 8) return json(res, 400, { ok: false, error: 'Ingresá un WhatsApp válido.' });

    const order = await insertOrder({
      event_slug: 'stylo-desarrollo-web',
      status: 'pending',
      product_code: plan.code,
      product_name: plan.name,
      amount: plan.amount,
      currency: 'ARS',
      buyer_name: company,
      buyer_phone: phone,
      buyer_email: null,
      quantity: 1,
      source: 'web',
      notes: JSON.stringify({ activity, location, objective })
    });

    const preference = await createPreference({ order, plan, baseUrl: getBaseUrl(req) });
    const updated = await updateOrder(order.id, {
      mp_preference_id: preference.id,
      mp_init_point: preference.init_point,
      mp_sandbox_init_point: preference.sandbox_init_point
    });

    return json(res, 200, {
      ok: true,
      order_id: updated.id,
      status: updated.status,
      checkout_url: preference.init_point,
      sandbox_checkout_url: preference.sandbox_init_point
    });
  } catch (error) {
    return handleError(res, error);
  }
};