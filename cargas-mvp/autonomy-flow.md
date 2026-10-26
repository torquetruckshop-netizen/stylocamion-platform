# Flujo autónomo por excepción

## Regla central

1. Una carga en `GREEN` puede continuar sin aprobación manual.
2. Una carga en `YELLOW` queda en revisión automática de IA.
3. Una carga en `RED` se deriva a revisión Stylo.

## Secuencia de autoasignación

1. La carga debe estar `PUBLICADA` o `BUSCANDO`.
2. El motor obtiene el ranking de candidatos.
3. Evalúa los candidatos en orden de score.
4. El candidato debe cumplir simultáneamente:
   - score igual o superior al mínimo configurado;
   - equipo compatible;
   - unidad `AVAILABLE`;
   - documentación de unidad `GREEN`;
   - carga `GREEN`;
   - ubicación suficientemente reciente cuando exista GPS/telemática.
5. Si el primero no cumple, se evalúa el siguiente.
6. Cuando existe un candidato elegible, la carga pasa a `PREASIGNADA`.
7. Tras aceptación del transportista, pasa a `ADJUDICADA` y la unidad a `BUSY`.
8. Si nadie acepta dentro del límite de candidatos, la carga sigue `BUSCANDO` o pasa a excepción según la política configurada.

## Seguimiento

Después de la adjudicación, la máquina de estados guía:

`ADJUDICADA -> EN_CAMINO_A_CARGA -> EN_CARGA -> EN_TRANSITO -> EN_DESTINO -> DESCARGANDO -> ENTREGADA -> A_EVALUAR -> CERRADA`

Cada transición genera un evento de auditoría.

## Excepciones que requieren Stylo

- documento crítico vencido o faltante;
- discrepancia entre documentación y unidad;
- conflicto de aceptación;
- problema en carga o descarga;
- pérdida prolongada de ubicación si la regla de la operación la exige;
- estado no previsto por la máquina de estados.
