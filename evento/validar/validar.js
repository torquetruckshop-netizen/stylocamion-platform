const pinInput = document.getElementById('pin');
const validatorInput = document.getElementById('validator');
const codeInput = document.getElementById('code');
const result = document.getElementById('result');
const video = document.getElementById('video');

pinInput.value = localStorage.getItem('stylo-validator-pin') || '';
validatorInput.value = localStorage.getItem('stylo-validator-name') || validatorInput.value;

function saveSettings() {
  localStorage.setItem('stylo-validator-pin', pinInput.value.trim());
  localStorage.setItem('stylo-validator-name', validatorInput.value.trim());
}

function render(data, ok = true) {
  const ticket = data.ticket;
  const status = data.status || (ok ? 'ok' : 'error');
  const labels = {
    valid: 'ENTRADA VÁLIDA',
    valid_for_event: 'ENTRADA VÁLIDA · 4 DÍAS',
    checked_in: 'INGRESO REGISTRADO',
    reentry_registered: 'REINGRESO VÁLIDO REGISTRADO',
    repeat_checkin: 'REINGRESO VÁLIDO REGISTRADO',
    already_checked_in: 'ENTRADA VÁLIDA PARA REINGRESO',
    box_delivered: 'CAJA RUTA ENTREGADA',
    already_delivered: 'ATENCIÓN: CAJA YA ENTREGADA',
    not_paid: 'NO FIGURA PAGADA',
    not_found: 'CÓDIGO INEXISTENTE',
  };

  const statusLabel = labels[status] || (ok ? 'OPERACIÓN OK' : 'NO VÁLIDA');
  const warn = status === 'already_delivered';
  result.className = `validation-result show ${ok ? 'ok' : 'bad'} ${warn ? 'warn' : ''}`;

  if (!ticket) {
    result.innerHTML = `<h2>${statusLabel}</h2><p>${data.error || data.message || 'Sin datos.'}</p>`;
    return;
  }

  const checkInCount = Number(ticket.checked_in_count || 0);
  const ingresoTexto = checkInCount > 0
    ? `${checkInCount} ingreso${checkInCount === 1 ? '' : 's'} / reingreso${checkInCount === 1 ? '' : 's'} registrado${checkInCount === 1 ? '' : 's'}`
    : 'Pendiente de primer ingreso';
  const primerIngreso = ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString('es-AR') : 'Sin registrar';

  result.innerHTML = `
    <h2>${statusLabel}</h2>
    ${data.message ? `<p>${data.message}</p>` : ''}
    <dl>
      <dt>Código</dt><dd>${ticket.ticket_code}</dd>
      <dt>Producto</dt><dd>${ticket.product_name}</dd>
      <dt>Titular</dt><dd>${ticket.buyer_name}</dd>
      <dt>WhatsApp</dt><dd>${ticket.buyer_phone || '-'}</dd>
      <dt>Vehículo</dt><dd>${ticket.vehicle_type || '-'} ${ticket.vehicle_plate ? '· ' + ticket.vehicle_plate : ''}</dd>
      <dt>Validez</dt><dd>Habilitado para los 4 días del evento</dd>
      <dt>Movimientos</dt><dd>${ingresoTexto}</dd>
      <dt>Primer ingreso</dt><dd>${primerIngreso}</dd>
      <dt>Caja Ruta</dt><dd>${ticket.includes_box ? (ticket.box_delivered_at ? 'Entregada' : 'Pendiente') : 'No incluida'}</dd>
    </dl>`;
}

async function validate(action) {
  saveSettings();
  const code = codeInput.value.trim().toUpperCase();

  if (!pinInput.value.trim()) return render({ error: 'Ingresá el PIN de control.' }, false);
  if (!code) return render({ error: 'Ingresá o escaneá un código.' }, false);

  result.className = 'validation-result show';
  result.innerHTML = '<p>Consultando...</p>';

  try {
    const response = await fetch('/api/evento/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput.value.trim(), validator: validatorInput.value.trim(), code, action }),
    });
    const data = await response.json();
    render(data, response.ok && data.ok);
  } catch (error) {
    render({ error: error.message }, false);
  }
}

document.getElementById('lookup').addEventListener('click', () => validate('lookup'));
document.getElementById('checkin').addEventListener('click', () => validate('checkin'));
document.getElementById('deliverBox').addEventListener('click', () => validate('deliver_box'));
codeInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') validate('lookup'); });

async function scanWithCamera() {
  if (!('BarcodeDetector' in window)) {
    render({ error: 'Este navegador no tiene lector QR integrado. Usá carga manual.' }, false);
    return;
  }

  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  video.classList.remove('hidden');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream;
  await video.play();

  const tick = async () => {
    const codes = await detector.detect(video).catch(() => []);
    if (codes.length) {
      const raw = codes[0].rawValue || '';
      const url = new URL(raw, location.origin);
      const code = url.searchParams.get('code') || raw;
      codeInput.value = code.toUpperCase();
      stream.getTracks().forEach((track) => track.stop());
      video.classList.add('hidden');
      validate('lookup');
      return;
    }
    requestAnimationFrame(tick);
  };

  tick();
}

document.getElementById('scan').addEventListener('click', () => {
  scanWithCamera().catch((error) => render({ error: error.message }, false));
});
