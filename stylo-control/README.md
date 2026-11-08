# STYLO CONTROL · MVP

Centro de control privado de Stylo Camión.

## Objetivo

Unificar métricas operativas, comerciales, audiencia y salud técnica de todos los módulos de Stylo Camión sin acoplarlos entre sí.

Fuentes previstas:

- Stylo Cargas
- Stylo Ventas
- Noticias
- Mercado Pago / ingresos
- Telemetría
- Sitio principal / audiencia
- IA / operaciones

## Principio de arquitectura

Cada módulo emite hechos normalizados (`control_facts`). STYLO CONTROL agrega esos hechos en métricas y snapshots.

`Módulo → hecho normalizado → STYLO CONTROL → métrica → Admin View / Investor View`

Esto permite que cada producto evolucione de forma independiente.

## Vistas

### ADMIN

Acceso a métricas operativas internas, estados de integraciones, excepciones y datos necesarios para administrar la plataforma.

### INVESTOR

Sólo indicadores agregados aprobados. Nunca devuelve teléfonos, nombres, emails, identificadores de usuarios, mensajes, patentes ni información sensible de clientes.

## Roles iniciales

- `OWNER`: control total.
- `ADMIN`: administración operativa.
- `ANALYST`: lectura de métricas internas sin administración sensible.
- `SUPPORT`: acceso operativo limitado.
- `INVESTOR`: sólo métricas agregadas expresamente permitidas.

## MVP 1

- catálogo versionado de métricas;
- control de acceso por rol;
- motor de agregación;
- resumen de usuarios, Cargas, Ventas, ingresos, audiencia, IA y telemetría;
- Investor Snapshot sanitizado;
- salud de módulos/integraciones;
- API aislada y testeable.

## Seguridad

STYLO CONTROL no debe exponerse públicamente. Las vistas administrativas requieren autenticación y autorización. Investor View usa una proyección agregada separada y no comparte consultas de detalle con Admin View.
