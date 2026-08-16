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

El orden fuente queda documentado en `db/MIGRATION_ORDER.md`. Incluye actualmente ingesta resiliente, ubicación, economía del viaje, telemetría y perfiles aprendidos de consumo por vehículo.

## 2. Identidad y administración

Requerido:
- `ADMIN_API_KEY`
- `SESSION_IDLE_DAYS=365`

Opcional:
- `GOOGLE_CLIENT_ID`

**Google no bloquea el acceso base.** El alta principal puede realizarse con teléfono/WhatsApp + rol y habilita acceso inmediato con revisión administrativa posterior. Google queda como identidad adicional vinculable cuando esté configurado.

La sesión se mantiene por cookie segura HttpOnly y renueva silenciosamente su ventana mientras exista actividad.

## 3. Encendido base

Desde `cargas-mvp/api`:

```bash
npm run check:staging
npm run start:staging
```

El staging base está listo cuando `check:staging` devuelve `ready: true`.

El chequeo acepta la nueva `SUPABASE_SECRET_KEY` o la clave legacy `SUPABASE_SERVICE_ROLE_KEY`. Google, WhatsApp y OpenAI aparecen como integraciones opcionales con su propio estado de readiness.

## 4. Matching de staging

El endpoint `POST /loads/:id/match` usa el motor de prioridad actual:

1. Mi Flota
2. Mi Red Privada
3. Red Stylo

Ya no usa coordenadas hardcodeadas ni una lista global indiferenciada de vehículos.

Para una oferta automática se requiere:
- carga en estado confiable;
- equipo compatible;
- documentación válida;
- capacidad suficiente;
- unidad disponible;
- ubicación del camión utilizable;
- origen geocodificado;
- distancia con confianza suficiente.

Sin proveedor vial, una ubicación fresca puede producir una estimación de ruta marcada `MEDIUM`. Una ubicación vieja o un origen no resuelto no habilitan automatización.

## 5. Economía del viaje

El matching puede adjuntar:
- kilómetros cargados y vacíos;
- litros estimados;
- combustible;
- peajes confirmados/estimados;
- costo variable;
- resultado preliminar del flete.

Prioridad para consumo:
1. perfil telemétrico aprendido y confiable;
2. parámetro específico del vehículo;
3. parámetro de la empresa;
4. default Stylo de 30 L/100 km.

## 6. WhatsApp real

Agregar después:
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`

El número real y los tokens no se guardan en GitHub.

## 7. IA real

Agregar:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Texto y transcripciones deben terminar en el mismo contrato de ingesta.

## 8. Telemetría

Las integraciones de telemetría son opcionales por empresa/unidad. Stylo puede aceptar Wialon, Navixy u otros proveedores mediante adaptadores al modelo neutral interno.

Los tokens reales del proveedor nunca se guardan en texto plano en las tablas. `telematics_connections.secret_reference` referencia un secreto seguro del backend.

Al finalizar un viaje, Stylo puede reconciliar:
- kilómetros reales;
- litros reales;
- consumo real L/100 km;
- costo real de combustible cuando se conoce el precio;
- diferencia entre estimado y real;
- actualización del perfil aprendido del camión.

## 9. Prueba maestra desde teléfono

1. Registrarse con teléfono/WhatsApp y entrar inmediatamente.
2. Cerrar la PWA/navegador y volver a abrir: debe conservar sesión.
3. Reenviar una carga real a Stylo Cargas Operaciones.
4. Confirmar que se guarda una sola vez en Supabase aunque el webhook se reintente.
5. Resolver origen/destino y ejecutar matching Mi Flota → Red Privada → Red Stylo.
6. Confirmar alerta de oportunidad y costo estimado cuando haya datos suficientes.
7. Aceptar/adjudicar y registrar el evento.
8. Si la unidad tiene telemetría, cerrar el viaje y comparar estimado vs. real.

## Gate antes de producción

No reemplazar `cargas.stylocamion.com` hasta que el circuito anterior funcione de punta a punta y Stylo pueda suspender/reactivar usuarios desde administración.
