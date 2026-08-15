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

## Nota

Existen dos archivos históricos con prefijo `002`. El despliegue inicial debe usar este orden explícito y no ordenar únicamente por nombre de archivo.

Antes de convertir estas migraciones en una cadena de producción, se renumerarán en una única secuencia o se migrarán al formato estándar del mecanismo de migraciones elegido para Supabase/Postgres.

## Seguridad

- Las claves secretas/service-role se usan sólo en backend.
- El navegador nunca recibe una clave administrativa.
- Antes de exponer acceso directo a tablas desde cliente, se deben definir políticas RLS específicas.
