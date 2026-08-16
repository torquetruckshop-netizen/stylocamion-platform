# STYLO CAMIÓN · WORLD-CLASS GO-LIVE GATES 2027

Este documento separa cuatro estados:

1. **DISEÑADO**: arquitectura/contrato definido.
2. **IMPLEMENTADO**: código y pruebas unitarias.
3. **INTEGRADO EN STAGING**: proveedor/base real conectados en entorno no productivo.
4. **PRODUCCIÓN VALIDADA**: E2E real, seguridad, legal y operación aprobadas.

Ningún módulo debe presentarse como “live” sólo porque tenga código verde.

## Gate transversal de seguridad

Antes de producción:
- RLS/ACL revisada por tabla y endpoint.
- secretos sólo en backend/secret manager.
- sesiones y revocación verificadas.
- rate limiting y protección de endpoints públicos.
- logs sin PII innecesaria.
- idempotencia de webhooks.
- backups/restauración probados.
- audit log de decisiones automáticas.
- política de retención/borrado de datos.
- mínimo privilegio para integraciones.

## Gate transversal de IA

Toda decisión IA debe declarar:
- fuente de datos;
- si es MEDIDA / INFERIDA / ESTIMADA;
- nivel de confianza;
- versión del modelo/regla;
- posibilidad de override humano;
- motivo auditable de bloqueo/recomendación.

Automatización irreversible sólo cuando las reglas de riesgo lo permitan.

# CARGAS

## Implementado/testeado
- intake WhatsApp/texto/audio resiliente.
- matching Mi Flota → Red Privada → Red Stylo.
- ubicación/confianza.
- economía de viaje y peajes estimables.
- telemetría neutral y consumo aprendido.
- Facility Intelligence.
- Continuous Moves.
- Carrier Preferences.
- Rate Intelligence / forecast.
- ETA / Exception Management.
- Counterparty Trust.
- Instant Book policy (sin ejecución real todavía).
- Conditional Bid engine.
- Market Heatmap.
- Exception Inbox.
- compliance documental.
- POD operacional verificable.
- ralentí, fuel anomaly, maintenance risk y efficiency analytics.

## Gates externos pendientes
- aplicar migraciones 008–016 en Supabase staging.
- conectar geocoder/router/peajes real.
- conectar WhatsApp Business real.
- conectar audio/IA real.
- conectar Wialon/Navixy/OEM piloto si se acuerda partner.
- validar categorías/tarifas de peaje por país.
- probar unidad/carga real E2E.
- revisión jurídica: documentos, POD, términos y responsabilidad por matching.
- Instant Book sólo después de validar cancelaciones, adjudicación, disputas y autorización de ambas partes.

# VENTAS

## Implementado/testeado
- market price intelligence.
- listing quality.
- saved searches/watchlist/price alerts.
- buyer intent/lead score.
- financing estimator no vinculante.
- technical comparator.
- Want-to-Buy.
- inventory rotation / seller funnel.
- conditional offers.
- digital inspection model.
- seller trust.
- similar listings.
- shipping estimate abstraction.

## Gates externos pendientes
- fuente real de comparables y política anti-manipulación.
- moneda/impuestos por país.
- integración real con inventario/publicaciones actuales.
- validación financiera antes de mostrar productos de crédito reales.
- logística: partner/tarifa real antes de convertir estimate en quote.
- revisión legal antes de reserva/seña/subasta.
- verificación documental real del vendedor/unidad.

# NOTICIAS

## Implementado/testeado
- trust de fuentes.
- impacto operativo.
- personalización.
- watchlists/briefs.
- contradicciones estructuradas.
- geofencing con cargas/vehículos.
- timeline temática.
- objeto ES/PT/EN + audio.
- story clustering.
- freshness/expiry.
- corrections/provenance.

## Gates externos pendientes
- catálogo real de fuentes aprobadas por país.
- deduplicación contra feed real.
- preview editorial con equipo Stylo.
- reglas de publicación automática y aprobación.
- pruebas de traducción/audio.
- integración con Cargas sólo para alertas verificadas.

# TELEMETRÍA

## Implementado/testeado
- modelo neutral multi-provider.
- consumo real vs estimado.
- profiles aprendidos.
- idle intelligence.
- fuel anomaly/fuel mismatch.
- maintenance risk.
- efficiency analytics.
- conversational fleet analytics determinista.
- future availability para próxima carga.

## Gates externos pendientes
- partner white-label/OEM seleccionado.
- permisos/API y límites comerciales.
- compatibilidad CAN/J1939/FMS por hardware.
- política de datos/consentimiento/retención.
- piloto con 1–5 unidades reales antes de escalar.

# STYLO CONTROL

## Implementado/testeado
- Admin/Investor views.
- métricas idempotentes.
- trends.
- Cargas/Ventas/MP/Web/Noticias adapters.
- funnel y attribution.
- health alerts.
- Investor Export.
- Conversational Analytics determinista.
- anomaly detection.
- cohorts/retention.
- unit economics.
- network liquidity.
- module quality.
- executive brief.

## Gates externos pendientes
- Supabase real + RLS.
- autenticación privada del panel.
- cargar hechos reales de módulos.
- revisar métricas financieras/monedas.
- alert delivery real.
- export compartible con expiración/autorización.

# Orden de pilotos recomendado

1. CONTROL con datos internos no sensibles.
2. CARGAS con una empresa piloto y pocas unidades.
3. TELEMETRÍA sobre esas mismas unidades.
4. VENTAS Intelligence sobre inventario piloto.
5. NOTICIAS Intelligence en preview antes de publicación automática.

# Regla final

La ventaja de Stylo no será tener más botones que otros marketplaces. Será cerrar el ciclo:

**dato real → contexto → recomendación → acción → resultado → aprendizaje**

con baja fricción, WhatsApp/voz donde el mercado lo necesita y APIs/digitalización completa donde el cliente ya está preparado.
