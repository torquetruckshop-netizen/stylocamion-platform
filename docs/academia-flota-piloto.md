# Academia Flota — primera implementación del piloto

Estado: código listo para revisión y pruebas de integración. No desplegado ni habilitado para cobrar.

## Alcance entregado

- Ruta `/academia-flota` en el servidor de cuenta única y acceso desde Mi Stylo cuando la función está habilitada.
- Espacios privados para responsables habilitados en `ACADEMY_PILOT_OWNER_IDS`.
- Invitaciones de un solo uso, almacenadas como hash, vencen a los siete días. El enlace utiliza fragmento para no registrar el token en logs HTTP.
- Aceptación explícita del participante: empresa, nombre, progreso, fechas y resultados. No recopila datos sanitarios.
- Asignación con fecha de entrega y recordatorio de revisión del aprendizaje (no vigencia legal).
- Lectura en texto de bajo consumo, evaluación de cinco preguntas corregida en backend, umbral 80%, espera de un minuto entre intentos fallidos.
- Curso y versión conservados en la asignación: editar un catálogo no altera resultados anteriores.
- Estados: pendiente, al día, próximo a revisar, requiere refuerzo; entrega atrasada identificada.
- Constancia privada imprimible/guardable como PDF y reporte CSV con protección frente a fórmulas.
- Desactivar participantes, conservando historial. Cada conductor ve solamente sus asignaciones; el responsable ve solamente su espacio.
- Persistencia Supabase exclusiva del backend con RLS y actualización condicional por revisión para evitar sobrescrituras concurrentes.
- Piloto acotado a 50 participantes históricos y 200 asignaciones por espacio; 2000 eventos auditables. No se eliminan datos al alcanzar esos límites.

## Contenido y límites de esta entrega

Hay cinco borradores teóricos en `platform-core/src/academy-courses.mjs`:
chequeo previo; fatiga; sujeción; neumáticos/frenos/acoples; ingreso al cliente.
Todos tienen estado `draft`. No son asignables hasta la revisión técnica humana.
No se ha inventado un revisor ni publicado una aprobación. La duración de diez minutos es estimativa.

La primera entrega usa texto. Videos, audio, descarga sin conexión, generación con IA,
envíos automáticos de WhatsApp, cobros recurrentes y métricas comerciales del piloto
no están implementados aquí. El botón WhatsApp prepara un mensaje; el usuario decide enviarlo.
La función no modifica los cursos abiertos ni convierte sus marcas locales en constancias.

El acceso usa la sesión de `platform-core`. El flujo de acceso anterior de ese núcleo aún utiliza
SMS: esta entrega no lo presenta como validación por WhatsApp ni cambia su proveedor.

## Habilitación en producción

1. Con acceso al proyecto Supabase correcto, aplicar primero las migraciones del núcleo y luego
   `platform-core/db/20260930_academy_flota.sql`. No se ejecutó en una base productiva durante esta entrega.
2. Un responsable técnico debe revisar cada contenido, referencias aplicables, evaluación y alcance;
   definir una versión estable, cambiar `status` a `reviewed` y registrar `reviewedBy` y `reviewedAt` reales.
   Publicar versiones nuevas en lugar de reescribir versiones asignadas.
3. Configurar `ACADEMY_PILOT_OWNER_IDS` con UUIDs de cuentas verificadas reales; no correos ni teléfonos.
   Activar `ACADEMY_FLOTA_ENABLED=true`. Sin esto la API responde 503 y Mi Stylo oculta el acceso.
4. Desplegar **platform-core**, cuya raíz y destino deben confirmarse; no basta con desplegar
   la carpeta estática `academia`. No cambiar DNS ni reemplazar la portada.
5. Verificar en producción con dos cuentas reales: crear espacio, invitación, aceptación,
   asignación, evaluación, constancia, revocación y aislamiento entre empresas. Verificar persistencia
   tras reiniciar el servidor y permisos anon/authenticated en la base.
6. Vincular pagos dentro de la suscripción empresarial existente cuando se haya comprobado el
   recorrido de suscripción. Esta entrega no crea productos ni precios en Mercado Pago.

El 30/09/2026 el conector Vercel no mostró equipos y devolvió 403 para `stylo-camion`.
Hace falta restablecer el acceso al equipo/proyecto real para comprobar y publicar ese despliegue.

## Validación comercial propuesta

Tres empresas, 50 conductores en total, 30 días. Hipótesis, no catálogo vigente:
ARS 80.000 + IVA por empresa para el piloto; luego ARS 120.000 + IVA hasta 20 participantes activos.
Registrar manualmente pago real, activación, finalización a siete días, soporte empleado y renovación.
Continuar si >=70% completa y >=2/3 renueva; reformular si finalización <60%; descartar si nadie renueva.
No trasladar automáticamente este precio a la suscripción única ni duplicar abonos.

Corrección del cálculo previo: ARS 1.200.000 / ARS 55.000 de contribución mensual equivale
aproximadamente a **22 cliente-meses**, no necesariamente 22 clientes. Ese recupero excluye
costos fijos mensuales e impuestos y no es un punto de equilibrio integral ni una promesa de ganancia.

## Verificación

`npm ci --prefix platform-core` y `npm test --prefix platform-core`.
La suite comprueba aislamiento entre empresas, claves de respuesta ocultas, invitaciones vencidas,
consentimiento, concurrencia, calificación en servidor, constancia idempotente, revocación,
adaptador de persistencia, autenticación HTTP, defensa CSRF y sanitización de errores de base.
Las aprobaciones de cursos en pruebas son fixtures locales; no se habilitan en el catálogo real.
La migración necesita ejecutarse y probarse en staging antes de producción.

Resultado local: 25 pruebas del núcleo aprobadas. También se recorrió la interfaz
con DOM ejecutable contra el servidor local: panel, invitación, curso, evaluación,
resultado y constancia. La revisión visual en navegador quedó pendiente: el navegador
no inició y la descarga de Chromium no entregó un archivo válido. No se afirma
validación visual ni funcionamiento en producción.
