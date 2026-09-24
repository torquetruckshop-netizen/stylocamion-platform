const $ = (selector) => document.querySelector(selector);
const state = { config: null, phone: '', token: null, account: null, products: [] };

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  trackPageview();
  try {
    state.config = await api('/api/public-config');
    state.products = await api('/api/products');
    await loadAccount();
  } catch (error) {
    if (!['AUTH_REQUIRED', 'AUTH_INVALID'].includes(error.message)) showNotice(humanError(error), true);
  }
}

function bindEvents() {
  $('#phone-form').addEventListener('submit', sendOtp);
  $('#otp-form').addEventListener('submit', verifyOtp);
  $('#profile-form').addEventListener('submit', bootstrapAccount);
  $('#change-phone').addEventListener('click', () => showStep('phone'));
  $('#logout').addEventListener('click', logout);
  $('#redeem').addEventListener('click', redeemQr);
}

async function sendOtp(event) {
  event.preventDefault();
  state.phone = normalizePhone($('#phone').value);
  if (!/^\+[1-9]\d{7,14}$/.test(state.phone)) return showNotice('Ingresá el número completo con +54 y código de área.', true);
  await busy(event.submitter, async () => {
    await supabase('/auth/v1/otp', { method: 'POST', body: { phone: state.phone, create_user: true } });
    $('#sent-phone').textContent = state.phone;
    showStep('otp');
    showNotice('Código enviado. Revisá tus SMS.');
    $('#otp').focus();
  });
}

async function verifyOtp(event) {
  event.preventDefault();
  const token = $('#otp').value.trim();
  await busy(event.submitter, async () => {
    const session = await supabase('/auth/v1/verify', { method: 'POST', body: { phone: state.phone, token, type: 'sms' } });
    state.token = session.access_token;
    await api('/api/session', { method: 'POST', bearer: state.token });
    try {
      await loadAccount();
    } catch (error) {
      if (error.message !== 'ACCOUNT_NOT_INITIALIZED') throw error;
      showProfile();
    }
  });
}

async function bootstrapAccount(event) {
  event.preventDefault();
  const roles = [...document.querySelectorAll('input[name="role"]:checked')].map((input) => input.value);
  await busy(event.submitter, async () => {
    state.account = await api('/api/account/bootstrap', {
      method: 'POST', bearer: state.token,
      body: { displayName: $('#display-name').value, countryCode: 'AR', roles, termsVersion: state.config.accountTermsVersion },
    });
    renderAccount();
  });
}

async function loadAccount() {
  state.account = await api('/api/account');
  renderAccount();
}

function renderAccount() {
  $('#login-card').classList.add('hidden');
  $('#profile-card').classList.add('hidden');
  $('#account').classList.remove('hidden');
  $('#logout').classList.remove('hidden');
  $('#welcome').textContent = `Hola${state.account.profile.displayName ? `, ${state.account.profile.displayName}` : ''}`;
  $('#products').innerHTML = state.products.map(productCard).join('');
  document.querySelectorAll('[data-buy]').forEach((button) => button.addEventListener('click', buyProduct));
  $('#orders').innerHTML = state.account.orders.length
    ? state.account.orders.map(orderCard).join('')
    : '<p>Todavía no tenés compras. Elegí un servicio para empezar.</p>';
  document.querySelectorAll('[data-qr]').forEach((button) => button.addEventListener('click', recoverQr));
  checkAdminAccess();
  if (location.pathname.startsWith('/validar/')) {
    $('#account').classList.add('hidden');
    $('#validator').classList.remove('hidden');
  }
}

async function checkAdminAccess() {
  try {
    const snapshot = await api('/api/admin/snapshot');
    $('#admin-link')?.classList.remove('hidden');
    if (location.pathname === '/admin') renderAdmin(snapshot);
  } catch (error) {
    if (location.pathname === '/admin') {
      $('#account')?.classList.add('hidden');
      showNotice('Este panel es exclusivo para administradores autorizados.', true);
    }
  }
}

function renderAdmin(snapshot) {
  $('#account')?.classList.add('hidden');
  $('#admin-panel')?.classList.remove('hidden');
  const orders = snapshot.orders || [];
  const approved = orders.filter((item) => item.status === 'approved');
  const revenue = approved.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const active = (snapshot.entitlements || []).filter((item) => item.status === 'active').length;
  const usedQr = (snapshot.qr || []).filter((item) => item.status === 'used').length;
  const analytics = snapshot.analytics || { pageviews: 0, uniqueSessions: 0, topPages: [] };
  const metrics = [
    ['Visitas · 30 días', analytics.pageviews || 0],
    ['Sesiones únicas', analytics.uniqueSessions || 0],
    ['Usuarios registrados', (snapshot.profiles || []).length],
    ['Órdenes totales', orders.length],
    ['Órdenes aprobadas', approved.length],
    ['Ingresos aprobados', money(revenue)],
    ['Accesos activos', active],
    ['QR utilizados', usedQr],
  ];
  $('#admin-metrics').innerHTML = metrics.map(([label,value]) => `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  $('#top-pages').innerHTML = analytics.topPages?.length
    ? analytics.topPages.map((item) => `<div><span>${escapeHtml(item.path)}</span><strong>${escapeHtml(item.views)}</strong></div>`).join('')
    : '<p>Aún no hay visitas registradas en este período.</p>';
  const activity = (snapshot.audit || []).slice(0, 12);
  $('#admin-activity').innerHTML = activity.length
    ? activity.map((item) => `<div><span>${escapeHtml(item.action)}<small>${escapeHtml(new Date(item.createdAt).toLocaleString('es-AR'))}</small></span><strong>${escapeHtml(item.result)}</strong></div>`).join('')
    : '<p>Aún no hay actividad administrativa registrada.</p>';
}

function analyticsSessionId() {
  const key = 'stylo-anon-session-v1';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function trackPageview() {
  let referrerHost = null;
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : null; } catch {}
  fetch('/api/analytics/pageview', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: analyticsSessionId(), path: location.pathname, referrerHost }),
    keepalive: true,
  }).catch(() => {});
}

function showProfile() {
  $('#login-card').classList.add('hidden');
  $('#profile-card').classList.remove('hidden');
  $('#logout').classList.remove('hidden');
}

function showStep(step) {
  $('#phone-step').classList.toggle('hidden', step !== 'phone');
  $('#otp-step').classList.toggle('hidden', step !== 'otp');
}

function productCard(product) {
  const free = product.amount === 0;
  return `<article class="product">
    <h3>${escapeHtml(product.name)}</h3>
    <small>${product.durationDays ? `Vigencia: ${product.durationDays} días` : 'Acceso según condiciones del servicio'}</small>
    <p class="price">${free ? 'Gratis' : money(product.amount, product.currency)}</p>
    <button data-buy="${escapeHtml(product.sku)}">${free ? 'Activar' : 'Contratar'}</button>
  </article>`;
}

async function buyProduct(event) {
  const button = event.currentTarget;
  await busy(button, async () => {
    const result = await api('/api/orders', {
      method: 'POST', body: { sku: button.dataset.buy, termsVersion: state.config.accountTermsVersion, payer: { phone: state.account.profile.phone } },
    });
    if (result.order.amount === 0) {
      await loadAccount();
      showNotice('Acceso activado correctamente.');
      return;
    }
    const checkout = await api(`/api/orders/${result.order.id}/checkout`, { method: 'POST' });
    location.href = checkout.checkoutUrl;
  });
}

function orderCard(order) {
  const product = state.products.find((item) => item.sku === order.sku);
  const qr = state.account.qr.find((item) => item.orderId === order.id);
  return `<article class="order">
    <div><strong>${escapeHtml(product?.name || order.sku)}</strong><p class="status">${escapeHtml(order.status)} · ${money(order.amount, order.currency)}</p></div>
    ${qr ? `<button class="secondary" data-qr="${escapeHtml(order.id)}">Ver acceso QR</button><div id="qr-${escapeHtml(order.id)}" class="qr-box hidden"></div>` : ''}
  </article>`;
}

async function recoverQr(event) {
  await busy(event.currentTarget, async () => {
    const qr = await api(`/api/orders/${event.currentTarget.dataset.qr}/qr`);
    const target = $(`#qr-${event.currentTarget.dataset.qr}`);
    target.innerHTML = `<img src="/api/orders/${encodeURIComponent(event.currentTarget.dataset.qr)}/qr.svg" alt="Código QR de acceso"><a class="qr-link" href="${escapeHtml(qr.payload)}">Abrir enlace de validación</a>`;
    target.classList.remove('hidden');
    event.currentTarget.textContent = 'QR listo';
  });
}

async function redeemQr(event) {
  const token = decodeURIComponent(location.pathname.split('/validar/')[1] || '');
  if (!token) return showNotice('El QR no contiene un acceso válido.', true);
  await busy(event.currentTarget, async () => {
    const result = await api('/api/admin/qr/redeem', { method: 'POST', body: { token } });
    $('#validation-result').textContent = result.ok ? '✓ Acceso válido. Ingreso registrado.' : `Acceso rechazado: ${result.reason}`;
  });
}

async function logout() {
  await api('/api/session', { method: 'DELETE' });
  location.href = '/';
}

async function supabase(path, options) {
  if (!state.config?.supabaseUrl || !state.config?.supabasePublishableKey) throw new Error('Servicio de acceso aún no configurado.');
  const response = await fetch(`${state.config.supabaseUrl}${path}`, {
    method: options.method,
    headers: { apikey: state.config.supabasePublishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body),
  });
  return responseJson(response);
}

async function api(path, { method = 'GET', body, bearer } = {}) {
  const response = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return responseJson(response);
}

async function responseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.msg || data.error || `ERROR_${response.status}`);
  return data;
}

async function busy(button, task) {
  button.disabled = true;
  try { await task(); } catch (error) { showNotice(humanError(error), true); }
  finally { button.disabled = false; }
}

function normalizePhone(value) { return value.trim().replace(/[\s()-]/g, ''); }
function money(amount, currency = 'ARS') { return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
function showNotice(message, error = false) { const box=$('#notice'); box.textContent=message; box.classList.remove('hidden'); box.classList.toggle('error',error); window.scrollTo({top:0,behavior:'smooth'}); }
function humanError(error) {
  const map = { AUTH_REQUIRED:'Ingresá con tu celular para continuar.', AUTH_INVALID:'La sesión venció. Volvé a ingresar.', ACCOUNT_NOT_INITIALIZED:'Completá tu cuenta para continuar.', ADMIN_REQUIRED:'Este acceso es exclusivo del personal autorizado.', ORDER_NOT_PAYABLE:'Esta orden ya fue procesada.' };
  return map[error.message] || error.message || 'No pudimos completar la operación. Intentá nuevamente.';
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
