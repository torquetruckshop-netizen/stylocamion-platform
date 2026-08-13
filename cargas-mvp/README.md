# Stylo Cargas · MVP autónomo

Primera base funcional para probar el flujo operativo antes de integrar servicios externos.

## Objetivo

Convertir mensajes de cargas y ofertas de camiones en operaciones estructuradas que puedan avanzar de forma autónoma cuando todas las reglas estén en verde.

## Flujo MVP

1. Entrada de mensaje desde WhatsApp directo, reenvío o operador.
2. Clasificación IA: carga, camión disponible, consulta o ruido.
3. Normalización: origen, destino, mercadería, peso, equipo, fecha, tarifa y contacto.
4. Validación documental.
5. Búsqueda y ranking de transportistas.
6. Adjudicación.
7. Seguimiento.
8. Descarga y cierre.
9. Auditoría e informe.

## Estados principales

- DETECTADA
- EN_VALIDACION
- PUBLICADA
- BUSCANDO
- PREASIGNADA
- ADJUDICADA
- EN_CAMINO_A_CARGA
- EN_CARGA
- EN_TRANSITO
- EN_DESTINO
- DESCARGANDO
- ENTREGADA
- A_EVALUAR
- CERRADA
- BLOQUEADA

## Semáforo

### Verde
Todo obligatorio está validado. La operación puede avanzar sin intervención Stylo.

### Amarillo
Existe una inconsistencia recuperable. La IA intenta resolverla: pedir dato, actualizar ubicación, solicitar confirmación, etc.

### Rojo
Existe una falla crítica. La operación se bloquea y queda visible en la torre de control Stylo.

## Scoring inicial

La demo usa una fórmula simple para validar el recorrido:

- compatibilidad de equipo
- documentación vigente
- disponibilidad
- distancia al origen
- reputación histórica

La fórmula se reemplazará por un motor configurable en backend.

## Integraciones previstas

### Etapa 1
- WhatsApp Business Cloud API
- base de datos de transportistas/unidades
- geolocalización de teléfono
- motor de IA para extracción estructurada

### Etapa 2
- GPS / telemática / GESTYA si existe acceso técnico autorizado
- pasaporte documental con vencimientos
- mensajería automática y escalamiento
- reputación operativa

### Etapa 3
- integraciones documentales oficiales disponibles, incluida Carta de Porte cuando corresponda
- reglas por tipo de mercadería y país
- operación autónoma por excepción
- reporting comercial y auditoría

## Principio de diseño

Stylo no debe aprobar cada paso. El sistema debe trabajar con reglas:

- TODO VERDE -> AVANZA
- AMARILLO -> IA INTENTA RESOLVER
- ROJO -> BLOQUEA
- CASO NO PREVISTO -> INTERVENCION STYLO

## Estado actual

El archivo `index.html` es un MVP frontend autónomo y ejecutable que permite probar el flujo conceptual y el scoring. No utiliza todavía datos productivos ni APIs externas.
