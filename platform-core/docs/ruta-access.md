# Stylo Ruta: integración inicial con Mi Stylo

Estado: código de preparación, sin despliegue y sin dinero real.

La ruta `/ruta` reutiliza la cuenta existente. `/api/ruta/access` autentica en el servidor con PlatformAuth y consulta el perfil del usuario identificado. No acepta identidad o roles desde parámetros. No emite saldos, CVU, permisos financieros ni crea una segunda cuenta. Responde sin caché.

El usuario sin sesión vuelve al ingreso existente en `/`. Luego de ingresar debe regresar a `/ruta`. No se implementó todavía retorno automático.

El ingreso existente usa Supabase OTP SMS; WhatsApp no está conectado por este cambio. Debe confirmarse el despliegue real de cuentas, su almacenamiento y el proveedor de WhatsApp antes de sustituir el canal. No solicitar credenciales por chat.

Los roles actuales del perfil son autodeclarados: no deben convertirse en autorización para administrar fondos. La próxima integración necesita membresías de empresa y autorizaciones explícitas, asignadas por responsables verificados, con cuenta, titular, chofer autorizado, límite, período y destinos. Toda operación tendrá que verificarlas en servidor.

El motor Python local de transferencias y la maqueta en Sites siguen separados de esta entrada. Este cambio no reemplaza la pantalla de ChatGPT de la demo privada de Sites, no configura dominios ni publica cambios en producción.

Verificación: `node --test platform-core/test/ruta-access.test.mjs platform-core/test/server.test.mjs` desde la raíz. Incluye acceso anónimo rechazado, sesión existente, identidad de URL ignorada, capacidades financieras denegadas, cierre de sesión y rutas de pantalla. Sin verificación visual en navegador.
