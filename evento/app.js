const products = [
  { code: 'caja_ruta_vehiculo', title: 'Caja Ruta Stylo Camión + ingreso', price: 20000, tag: 'Online recomendado', vehicleType: 'camion', requiresVehicle: true, description: 'Comprás la caja rutera y el ingreso vehicular viene incluido. En puerta, mismo valor sin caja.' },
  { code: 'ingreso_camion', title: 'Ingreso con camión', price: 35000, tag: 'Camiones', vehicleType: 'camion', requiresVehicle: true, description: 'Ingreso del camión al predio. Válido para los 4 días del evento.' },
  { code: 'ingreso_auto_pickup', title: 'Ingreso auto / pick-up', price: 20000, tag: 'Autos y pick-ups', vehicleType: 'auto_pickup', requiresVehicle: true, description: 'Ingreso de auto o pick-up al predio. Válido para los 4 días.' },
  { code: 'ingreso_moto', title: 'Ingreso moto', price: 15000, tag: 'Motos', vehicleType: 'moto', requiresVehicle: true, description: 'Ingreso de moto al predio.' },
  { code: 'entrada_general', title: 'Entrada general anticipada', price: 10000, tag: 'Personas', vehicleType: 'sin_vehiculo', requiresVehicle: false, description: 'Ingreso general anticipado. Válido para los 4 días del evento.' },
  { code: 'estacionamiento_visitante', title: 'Estacionamiento visitante', price: 10000, tag: 'Estacionamiento', vehicleType: 'auto_pickup', requiresVehicle: true, description: 'Estacionamiento visitante. Valor editable según la política final del evento.' }
];
const formatMoney = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const productList = document.getElementById('productList');
const productCode = document.getElementById('productCode');
const vehicleType = document.getElementById('vehicleType');
const vehiclePlate = document.getElementById('vehiclePlate');
const summaryName = document.getElementById('summaryName');
const summaryAmount = document.getElementById('summaryAmount');
const form = document.getElementById('orderForm');
const statusBox = document.getElementById('formStatus');
const submitButton = document.getElementById('submitButton');
function renderProducts() { productList.innerHTML = products.map((product, index) => `<button class="product ${index === 0 ? 'active' : ''}" type="button" data-code="${product.code}"><span>${product.tag}</span><strong>${product.title}</strong><small>${product.description}</small><b>${formatMoney(product.price)}</b></button>`).join(''); }
function selectProduct(code) { const product = products.find((item) => item.code === code) || products[0]; productCode.value = product.code; summaryName.textContent = product.title; summaryAmount.textContent = formatMoney(product.price); vehicleType.value = product.vehicleType; vehiclePlate.required = product.requiresVehicle; vehiclePlate.closest('label').classList.toggle('muted', !product.requiresVehicle); [...document.querySelectorAll('.product')].forEach((button) => button.classList.toggle('active', button.dataset.code === product.code)); }
renderProducts(); selectProduct(productCode.value);
productList.addEventListener('click', (event) => { const button = event.target.closest('.product'); if (button) selectProduct(button.dataset.code); });
form.addEventListener('submit', async (event) => { event.preventDefault(); statusBox.className = 'status'; statusBox.textContent = 'Generando orden y conectando con Mercado Pago...'; submitButton.disabled = true; const payload = Object.fromEntries(new FormData(form).entries()); try { const response = await fetch('/api/evento/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo crear la orden.'); statusBox.textContent = 'Orden creada. Redirigiendo a Mercado Pago...'; location.href = data.checkout_url; } catch (error) { statusBox.className = 'status error'; statusBox.textContent = error.message; submitButton.disabled = false; } });