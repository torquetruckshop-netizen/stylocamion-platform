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

## Nota

Existen dos archivos históricos con prefijo `002`. El despliegue inicial debe usar este orden explícito y no ordenar únicamente por nombre de archivo.

Antes de convertir estas migraciones en una cadena de producción, se renumerarán en una única secuencia o se migrarán al formato estándar del mecanismo de migraciones elegido para Supabase/Postgres.

`008_resilient_digital_intake.sql` convierte `intake_messages` en la bandeja universal e idempotente de entrada. Evita duplicados cuando una fuente reintenta un mensaje y permite dejar audios/documentos pendientes para procesamiento posterior sin perderlos si reinicia el backend.

`009_location_resolution.sql` agrega una cache geográfica reutilizable y trazabilidad de confianza para origen/destino. El matching autónomo no debe tratar una localidad ambigua o una ubicación vieja del vehículo como una distancia confiable.

`010_trip_economics.sql` incorpora consumo estimado de combustible, precio de gasoil, peajes confirmados/estimados y snapshots de costo variable por carga/unidad. El valor base de consumo es 30 L/100 km, con override por empresa o vehículo.

## Seguridad

- Las claves secretas/service-role se usan sólo en backend.
- El navegador nunca recibe una clave administrativa.
- Antes de exponer acceso directo a tablas desde cliente, se deben definir políticas RLS específicas.
