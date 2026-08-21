# Stylo Camión Platform Core

Núcleo inicial para la cuenta única, órdenes, Mercado Pago, beneficios, QR de
Feria y administración. Está aislado de producción hasta completar Supabase,
credenciales, WhatsApp y pruebas reales.

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

## Pendientes antes de producción

1. Conectar el almacenamiento Supabase mediante la migración definitiva.
2. Configurar Phone Auth/WhatsApp y la cookie compartida para `.stylocamion.com`.
3. Cargar secretos de Mercado Pago sólo en el backend.
4. Implementar el envío de QR por WhatsApp y su recuperación en Mi Cuenta.
5. Probar pagos aprobados, pendientes, rechazados y reintegrados con cuentas de prueba.
6. Ejecutar un pago real controlado por cada tipo de beneficio.

La firma de webhooks sigue el manifiesto HMAC vigente del SDK oficial de
Mercado Pago. Después de validar la firma, el backend debe consultar el pago a
Mercado Pago y no confiar en el cuerpo de la notificación.
