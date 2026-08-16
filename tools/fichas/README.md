# Recolector de fichas técnicas

Primera etapa de la biblioteca técnica de Stylo Camión.

## Alcance actual

- Volkswagen Camiones y Buses Argentina.
- Isuzu Argentina.
- Fuentes limitadas a dominios oficiales autorizados.
- Modelos ordenados por marca y año, del más nuevo al más antiguo.
- Documentos y páginas en estado `pending_review`.
- Control de duplicados mediante SHA-256.
- Sin publicación automática en la web.

## Ejecución

```bash
python tools/fichas/collector.py --dry-run
python tools/fichas/collector.py
```

El catálogo se genera en `tools/fichas/output/catalog.json`. La automatización
se ejecuta los lunes a las 06:15 UTC y también puede iniciarse manualmente desde
GitHub Actions. Cada ejecución conserva durante 30 días un artefacto descargable
para revisión.

## Próxima etapa

1. Revisar el primer resultado real.
2. Añadir Supabase Storage y las tablas del catálogo.
3. Incorporar el panel privado de aprobación.
4. Publicar sólo registros aprobados en el Club Stylo.
5. Ampliar a Mercedes-Benz, Iveco, Scania, Volvo, Agrale y marcas chinas.
