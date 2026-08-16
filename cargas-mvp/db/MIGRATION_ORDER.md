# Orden de migraciones · Stylo Cargas MVP

Aplicar en este orden para el primer staging:

1. `001_initial_schema.sql`
2. `002_channels.sql`
3. `002_commercial_and_conversations.sql`
4. `003_private_network.sql`
5. `004_notifications.sql`
6. `005_users_registration.sql`
7. `006_user_identities.sql`
8. `007_persistent_user_sessions.sql`
9. `008_resilient_digital_intake.sql`
10. `009_location_resolution.sql`
11. `010_trip_economics.sql`
12. `011_telematics_integrations.sql`
13. `012_vehicle_efficiency_profiles.sql`
14. `013_marketplace_intelligence.sql`
15. `014_operational_intelligence.sql`

## Nota

Existen dos archivos históricos con prefijo `002`. El despliegue inicial debe usar este orden explícito y no ordenar únicamente por nombre de archivo.

Antes de convertir estas migraciones en una cadena de producción, se renumerarán en una única secuencia o se migrarán al formato estándar del mecanismo de migraciones elegido para Supabase/Postgres.

`008_resilient_digital_intake.sql` convierte `intake_messages` en la bandeja universal e idempotente de entrada.

`009_location_resolution.sql` agrega cache geográfica y trazabilidad de confianza para origen/destino.

`010_trip_economics.sql` incorpora combustible, gasoil, peajes y snapshots de costo variable.

`011_telematics_integrations.sql` agrega conexiones multi-proveedor de telemetría, ECU/GPS y métricas reales por viaje.

`012_vehicle_efficiency_profiles.sql` mantiene un perfil aprendido de consumo por camión.

`013_marketplace_intelligence.sql` agrega inteligencia de instalaciones, tiempos de espera, preferencias aprendidas de transportistas y planes de movimientos continuos.

`014_operational_intelligence.sql` agrega propuestas de Instant Book, bids condicionados, Exception Inbox y snapshots de market heatmap.

## Seguridad

- Las claves secretas/service-role se usan sólo en backend.
- Los tokens de telemetría/API no se guardan en texto plano en tablas.
- El navegador nunca recibe una clave administrativa.
- Antes de exponer acceso directo a tablas desde cliente, se deben definir políticas RLS específicas.
