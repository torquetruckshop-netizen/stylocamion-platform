# Stylo Cargas · Puesta en marcha de staging

Objetivo: levantar una versión HTTPS privada, separada de producción, para validar el circuito real desde un teléfono.

## Regla de seguridad

Nunca copiar secretos reales al repositorio ni al frontend. Todas las credenciales privadas se cargan como variables del entorno del servidor.

## 1. Base persistente Supabase

Crear un proyecto Supabase exclusivo de staging.

Variables del servidor:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferida en proyectos nuevos) **o** `SUPABASE_SERVICE_ROLE_KEY` (compatibilidad legacy)

La clave de servidor queda exclusivamente en backend.

### Esquema de base

Desde `cargas-mvp/api`:

```bash
npm install
npm run build:bootstrap
```

Esto genera `cargas-mvp/db/bootstrap-staging.generated.sql`, combinando las migraciones en el orden correcto. Ejecutar ese SQL una sola vez en el SQL Editor del proyecto Supabase de staging.

El orden fuente queda documentado en `db/MIGRATION_ORDER.md`.

## 2. Identidad y administración

Configurar:
- `GOOGLE_CLIENT_ID`
- `ADMIN_API_KEY`
- `SESSION_IDLE_DAYS=365`

El alta queda activa inmediatamente y con revisión administrativa pendiente. La sesión se mantiene por cookie segura HttpOnly y renueva silenciosamente su ventana mientras exista actividad.

## 3. Encendido base

Desde `cargas-mvp/api`:

```bash
npm run check:staging
npm run start:staging
```

El staging base está listo cuando `check:staging` devuelve `ready: true`.

El chequeo acepta la nueva `SUPABASE_SECRET_KEY` o la clave legacy `SUPABASE_SERVICE_ROLE_KEY`.

## 4. WhatsApp real

Agregar después:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`

El número real y los tokens no se guardan en GitHub.

## 5. IA real

Agregar:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Texto y transcripciones deben terminar en el mismo contrato de ingesta.

## 6. Prueba maestra desde teléfono

1. Entrar/registrarse con Google + WhatsApp.
2. Cerrar la PWA/navegador y volver a abrir: debe conservar sesión.
3. Reenviar una carga real a Stylo Cargas Operaciones.
4. Confirmar que se guarda en Supabase.
5. Ejecutar matching contra la flota piloto.
6. Confirmar alerta de oportunidad.
7. Aceptar/adjudicar y registrar el evento.

## Gate antes de producción

No reemplazar `cargas.stylocamion.com` hasta que el circuito anterior funcione de punta a punta y Stylo pueda suspender/reactivar usuarios desde administración.
