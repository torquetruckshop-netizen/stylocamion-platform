# Stylo Copiloto — MVP integrado

## Objetivo

Convertir activos existentes de Stylo Camión en una herramienta de decisión económica para transportistas: **antes de aceptar un viaje, calcular si conviene y buscar una alternativa de regreso en CARGAS**.

No se crea una plataforma paralela. Copiloto debe reutilizar cuenta única, CARGAS, WhatsApp, Mercado Pago, panel administrativo y la PWA principal.

## Promesa al usuario

**Antes de aceptar un viaje, preguntale a Stylo.**

Entrada inicial: texto pegado desde WhatsApp o formulario corto. En una etapa posterior se incorporan audio e imagen/captura.

Salida mínima:

- ingreso ofrecido;
- kilómetros cargados y vacíos;
- combustible estimado;
- peajes, chofer y otros costos;
- costo fijo imputado por kilómetro;
- costo total y costo/km;
- margen estimado;
- semáforo `CONVIENE`, `AJUSTADO` o `NO_CONVIENE`;
- precio mínimo sugerido para el margen objetivo;
- posibilidad de buscar regreso en CARGAS y recalcular el circuito completo.

## Integración con lo que ya existe

### Cuenta única

El perfil económico se asocia al usuario existente. No se crea otro login.

### CARGAS

Copiloto consume cargas vigentes compatibles con destino, radio de búsqueda, fecha, tipo de equipo y capacidad. El teléfono del dueño de la carga continúa sujeto a las reglas comerciales y de privacidad de CARGAS; Copiloto no debe saltarlas.

### WhatsApp

Primera experiencia comercial: el usuario puede copiar una oferta recibida por WhatsApp y pegarla en Copiloto. La integración automática de mensajes se habilita solamente con consentimiento y una integración oficial; nunca se leen chats personales de forma indiscriminada.

### Mercado Pago

La versión gratuita permite una cuota limitada de análisis. PRO reutilizará el catálogo/órdenes/beneficios ya existente en Platform Core. El precio se define después de medir uso real del MVP.

### PWA principal

Agregar un acceso destacado `COPILOTO` en la plataforma principal y dentro de CARGAS. Debe funcionar correctamente desde el acceso directo instalado en el teléfono.

### Panel administrativo

Métricas mínimas: análisis iniciados, análisis completados, corredores consultados, porcentaje con retorno encontrado, ahorro/margen estimado agregado y conversión Free → PRO. No almacenar textos de WhatsApp más tiempo del necesario para procesarlos salvo consentimiento explícito.

## Datos mínimos del perfil del camión

- tipo/configuración de unidad;
- consumo km/l;
- combustible habitual;
- costo fijo mensual o costo fijo/km;
- kilómetros mensuales estimados;
- costo de chofer configurable;
- margen objetivo;
- moneda y país.

Los valores sugeridos deben estar identificados como estimaciones. La decisión final se calcula con los datos del usuario cuando estén disponibles.

## Fases

### Fase 1 — Calculadora útil

Motor determinístico de rentabilidad, sin IA tomando decisiones financieras. La IA puede interpretar texto y completar campos, pero el cálculo final debe ser reproducible y auditable.

### Fase 2 — CARGAS

Matching de retornos y recálculo ida + vuelta. Ordenar candidatos por compatibilidad operativa y resultado económico, no solo por cercanía.

### Fase 3 — WhatsApp

Entrada por WhatsApp Business/API oficial: texto y audio; extracción estructurada con confirmación del usuario antes de calcular.

### Fase 4 — PRO

Historial, múltiples camiones, costos reales vs. previstos, alertas, corredores frecuentes y reportes.

## Regla de producto

Copiloto no debe afirmar que un viaje es rentable si faltan variables críticas. Si faltan datos, devuelve `DATOS_INCOMPLETOS` y muestra exactamente qué debe completar el usuario.

## Métrica de validación

El MVP se considera validado si usuarios reales vuelven a utilizarlo para decidir viajes y una fracción relevante solicita historial, automatización o análisis ilimitados. La disposición a pagar debe medirse antes de fijar el plan definitivo.
