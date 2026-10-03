# CARGAS IA — MVP

## Objetivo
Transformar CARGAS desde una cartelera de viajes hacia una central inteligente de operaciones.

## Primera capa
1. Orquestador
2. Alta inteligente de carga
3. Matching
4. Radar de retornos
5. Gestión por excepciones

## Regla de producto
La IA debe eliminar pasos. No se agregan validaciones manuales.

## Flujo
Texto/voz del usuario → extracción de datos → completar solo faltantes → publicar → matching → detectar retornos → seguimiento → alertas.

## Integración pendiente
El subdominio cargas.stylocamion.com se encuentra desplegado fuera del código disponible en este repositorio. El endpoint `/api/cargas/orchestrate` se construyó con CORS abierto para poder ser consumido desde el frontend actual de CARGAS cuando se identifique su proyecto fuente.

## Próximas conexiones
- Base real de cargas y transportistas.
- Geolocalización.
- WhatsApp.
- Documentación.
- Seguimiento y ETA.
- Comisión/pagos.
- Motor IA semántico sobre el parser determinístico del MVP.
