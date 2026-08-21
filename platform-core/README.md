# Stylo Camión Platform Core

Núcleo inicial para la cuenta única, órdenes, Mercado Pago, beneficios, QR de
Feria y administración. Incluye almacenamiento persistente mediante la Data
API de Supabase. Sigue aislado de producción hasta cargar las credenciales,
ejecutar la migración y completar las pruebas reales de pagos y WhatsApp.

## Reglas incorporadas

- una cuenta para toda la Red Stylo Camión;
- múltiples roles dentro del mismo registro y acceso gratuito común;
- Cargas gratuito en esta etapa, sin comisión;
- orden creada antes de redirigir a Mercado Pago;
- el navegador nunca confirma un pago;
- importe y moneda se comparan contra el catálogo del servidor;
- eventos de pago idempotentes;
- reintegros y contracargos revocan beneficios;
- QR para entradas personales y espacios de vehículos;
- el QR se guarda como hash más una copia cifrada recuperable por su dueño y puede utilizarse una sola vez;
- acciones administrativas auditables.

## Ejecución local

```bash
npm test
npm run audit:navigation
```

## Ejecución en producción

El servidor selecciona `SupabaseStore` cuando `NODE_ENV=production`; en otros
entornos utiliza memoria para las pruebas. La clave `SUPABASE_SECRET_KEY` es
exclusiva del backend y nunca debe enviarse al navegador ni versionarse.

Antes de iniciar:

1. ejecutar `db/20260821_platform_core.sql` en Supabase;
2. copiar `.env.example` a un archivo de entorno privado del servidor;
3. cargar las claves de Supabase, Mercado Pago y QR;
4. ejecutar `npm test` y luego `npm start` bajo PM2.

## Pendientes antes de producción

1. Ejecutar y verificar la migración en el proyecto Supabase definitivo.
2. Configurar Phone Auth/WhatsApp y la cookie compartida para `.stylocamion.com`.
3. Cargar secretos de Mercado Pago sólo en el backend.
4. Implementar el envío de QR por WhatsApp y su recuperación en Mi Cuenta.
5. Probar pagos aprobados, pendientes, rechazados y reintegrados con cuentas de prueba.
6. Ejecutar un pago real controlado por cada tipo de beneficio.

La firma de webhooks sigue el manifiesto HMAC vigente del SDK oficial de
Mercado Pago. Después de validar la firma, el backend debe consultar el pago a
Mercado Pago y no confiar en el cuerpo de la notificación.
