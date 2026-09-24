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
16. `015_delivery_documents.sql`
17. `016_telematics_intelligence.sql`

## Nota
Existen dos archivos históricos con prefijo `002`. El despliegue inicial debe usar este orden explícito.

`008_resilient_digital_intake.sql`: bandeja universal/idempotente.
`009_location_resolution.sql`: cache geográfica y confianza.
`010_trip_economics.sql`: combustible, peajes y costo variable.
`011_telematics_integrations.sql`: conexiones multi-proveedor ECU/GPS.
`012_vehicle_efficiency_profiles.sql`: consumo aprendido por camión.
`013_marketplace_intelligence.sql`: instalaciones, espera, preferencias y movimientos continuos.
`014_operational_intelligence.sql`: Instant Book, bids, Exception Inbox y heatmap.
`015_delivery_documents.sql`: compliance documental, POD operacional y disputas.
`016_telematics_intelligence.sql`: ralentí, anomalías de combustible, mantenimiento y eficiencia operacional.

## Seguridad y gate legal
- Las claves secretas/service-role se usan sólo en backend.
- Los tokens de telemetría/API no se guardan en texto plano.
- El navegador nunca recibe una clave administrativa.
- Definir RLS antes de exponer tablas a clientes.
- POD y reglas documentales se consideran evidencia operacional hasta completar revisión jurídica por país.
