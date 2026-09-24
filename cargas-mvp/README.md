# Stylo Cargas · MVP autónomo

Este módulo vive aislado de producción en la rama `agent/cargas-mvp-autonomo`.

## Objetivo

Probar el circuito operativo completo antes de conectar servicios externos:

1. recibir una carga desde WhatsApp/reenvío/formulario;
2. estructurarla;
3. marcar faltantes;
4. validar reglas de compliance;
5. buscar unidades compatibles;
6. rankear candidatos;
7. adjudicar;
8. registrar eventos y excepciones.

## Estado actual

### Ya implementado

- interfaz funcional aislada;
- modelo de dominio;
- contrato OpenAPI inicial;
- backend Node.js sin dependencias externas;
- endpoint de ingesta `/intake/messages`;
- listado de cargas `/loads`;
- matching `/loads/{loadId}/match`;
- adjudicación `/loads/{loadId}/assign`;
- actualización de ubicación `/vehicles/{vehicleId}/location`;
- registro de eventos `/loads/{loadId}/events`;
- listado de excepciones `/exceptions`;
- parser heurístico inicial para mensajes de prueba;
- scoring por equipo, documentación, disponibilidad, distancia y reputación;
- semáforo GREEN / YELLOW / RED;
- datos piloto de transportistas y unidades;
- tests automáticos del motor;
- workflow de CI para el MVP.

### Pruebas verificadas

La cadena fue ejecutada localmente de punta a punta:

`mensaje natural -> carga estructurada -> matching -> ranking -> adjudicación -> unidad BUSY`

También se corrigieron casos de:

- frases del tipo `en Rafaela para Rosario`;
- horario argentino `-03:00`;
- transición inmediata de la unidad a ocupada tras adjudicación.

## Cómo ejecutar la API

```bash
cd cargas-mvp/api
npm test
npm start
```

Servidor local por defecto: `http://localhost:8787`.

## Limitaciones intencionales de esta fase

- almacenamiento en memoria;
- parser heurístico en lugar de OpenAI;
- coordenadas de algunas ciudades embebidas sólo para demo;
- sin WhatsApp Business real;
- sin Supabase;
- sin GESTYA/telemática real;
- sin integración documental externa.

Estas limitaciones permiten validar el flujo sin bloquear el proyecto por integraciones de terceros.

## Próximo bloque

1. persistencia real en Supabase/Postgres;
2. adaptador de normalización con OpenAI Structured Outputs;
3. webhook de WhatsApp Business;
4. catálogo real de transportistas/unidades piloto;
5. geolocalización real;
6. reglas de compliance persistentes;
7. motor autónomo de contacto/escalamiento;
8. tablero conectado a datos reales.

## Regla operativa objetivo

- **GREEN**: avanza sin autorización humana;
- **YELLOW**: la IA intenta resolver;
- **RED**: bloquea y deriva a Stylo.
