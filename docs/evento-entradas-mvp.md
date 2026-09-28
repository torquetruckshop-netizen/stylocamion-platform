# Evento / Entradas MVP

Módulo inicial para cobrar entradas, ingresos vehiculares, estacionamiento y Caja Ruta Stylo Camión.

## Flujo operativo

1. El comprador entra a `/evento/`.
2. Completa datos y elige producto.
3. `/api/evento/create-order` crea una orden interna en Supabase con estado `pending`.
4. La API crea una preferencia de Mercado Pago usando `external_reference = order.id`.
5. Mercado Pago redirige al comprador a `/evento/confirmacion.html`.
6. El webhook `/api/evento/mp-webhook` consulta el pago real en Mercado Pago.
7. Si el pago está aprobado y el monto coincide, la orden pasa a `paid` y se genera `ticket_code`.
8. Si WhatsApp Cloud API está configurado, se envía el código al teléfono.
9. En el ingreso, el equipo usa `/evento/validar/` con PIN para consultar, registrar ingreso o entregar Caja Ruta.

## Regla de uso del código

- El mismo código/QR es válido para los 4 días del evento.
- El primer escaneo con acción `checkin` registra el primer ingreso.
- Los siguientes escaneos con acción `checkin` registran reingresos válidos, no bloquean el acceso.
- Cada ingreso/reingreso queda guardado en `event_access_logs`.
- La Caja Ruta, cuando el producto la incluye, se puede entregar una sola vez. Ese control es independiente del ingreso/reingreso.

## Variables de entorno necesarias

Obligatorias para cobrar:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `PUBLIC_BASE_URL` — ejemplo: `https://stylocamion.com`
- `VALIDATOR_PIN`

Opcionales para WhatsApp automático:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

## Base de datos

Ejecutar en Supabase:

- `supabase/migrations/20260928_evento_entradas.sql`

Tablas creadas:

- `event_orders`
- `event_access_logs`

## Rutas públicas

- `/evento/` — compra de entradas/productos.
- `/evento/confirmacion.html` — confirmación y recuperación del código.
- `/evento/ticket.html?code=...` — entrada visible en teléfono.
- `/evento/validar/` — panel de control para ingreso.

## APIs

- `POST /api/evento/create-order`
- `GET /api/evento/order?order_id=...&payment_id=...`
- `GET|POST /api/evento/mp-webhook`
- `GET /api/evento/ticket?code=...`
- `POST /api/evento/validate`

## Seguridad mínima incluida

- El QR/código solo se genera si Mercado Pago confirma pago aprobado.
- El monto pagado debe coincidir con la orden interna.
- La validación en puerta requiere `VALIDATOR_PIN`.
- Cada consulta, ingreso, reingreso y entrega de caja queda registrada en `event_access_logs`.
- La Caja Ruta tiene control separado de entrega para evitar doble retiro.
