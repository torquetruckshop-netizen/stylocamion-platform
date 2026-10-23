# STYLO CONTROL · Fact Contract v1

Todos los módulos envían hechos normalizados. El panel no debe leer directamente la lógica interna de cada producto.

## Estructura

```json
{
  "module": "CARGAS",
  "source_event_id": "load-match-<id>",
  "event_type": "LOAD_MATCHED",
  "entity_type": "LOAD",
  "entity_id": "<internal-id>",
  "value": null,
  "currency": null,
  "status": null,
  "channel": "WHATSAPP",
  "country": "AR",
  "dimensions": {
    "network_level": "OWN_FLEET"
  },
  "occurred_at": "2026-08-16T01:00:00Z"
}
```

## Reglas

1. `source_event_id` debe ser estable e idempotente para eventos externos o reintentables.
2. Nunca enviar secretos, tokens, mensajes completos ni credenciales.
3. `dimensions` no puede contener nombre, teléfono, email, DNI, patente o texto crudo de WhatsApp.
4. `entity_id` puede ser un identificador interno porque sólo se utiliza para agregación/COUNT DISTINCT; Investor View nunca lo devuelve.
5. Importes deben incluir `currency`.
6. Los hechos representan eventos ocurridos; no reemplazan la base operacional del módulo.

## Eventos iniciales

### PLATFORM
- `USER_REGISTERED`
- `USER_ACTIVATED`
- `USER_SUSPENDED`

### CARGAS
- `LOAD_DETECTED`
- `LOAD_MATCHED`
- `LOAD_AWARDED`
- `LOAD_COMPLETED`
- `EMPTY_KM_AVOIDED`

### VENTAS
- `SALES_LISTINGS_ACTIVE`
- `SALES_INQUIRY`
- `SALES_SERVICE_PURCHASED`

### REVENUE
- `PAYMENT_CONFIRMED`
- `REVENUE_RECORDED`
- `GMV_RECORDED`

### AUDIENCE
- `UNIQUE_VISITORS`
- `PAGE_VIEWS`

### AI
- `AI_MESSAGE_PROCESSED`
- `AI_AUDIO_TRANSCRIBED`
- `AI_DECISION`
- `AI_EXCEPTION`

### TELEMATICS
- `TELEMATICS_CONNECTED_VEHICLES`
- `FUEL_LITERS_AVOIDED`

## Idempotencia

La combinación `(module, source_event_id)` es única. Un reintento del mismo webhook o evento debe devolver/reutilizar el hecho existente y no incrementar métricas nuevamente.
