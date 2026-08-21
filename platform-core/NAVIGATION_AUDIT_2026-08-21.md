# Auditoría de dominios y navegación · 21/08/2026

## Resultado principal

| Dominio | Estado | Observación |
| --- | ---: | --- |
| `stylocamion.com` | 200 | Portada activa con HTTPS. |
| `ventas.stylocamion.com` | 200 | Marketplace activo con HTTPS. |
| `cargas.stylocamion.com` | 200 | Portada de Cargas activa con HTTPS. |
| `noticias.stylocamion.com` | 200 | Portal nuevo activo con HTTPS. |
| `cuentas.stylocamion.com` | 502 | Bloqueante: el dominio existe pero no entrega la aplicación. |
| `choferes.stylocamion.com` | 502 | Bloqueante: el dominio existe pero no entrega la aplicación. |

## Hallazgos de recorrido

1. `stylocamion.com/empleo` redirige a un dominio temporal
   `choferes-stylo-camion.stylocamion.chatgpt.site`; debe pasar al dominio canónico
   `https://choferes.stylocamion.com` cuando el despliegue quede saludable.
2. `ventas.stylocamion.com/admin` deriva a una autenticación externa y no al
   panel administrativo operativo de Stylo Camión.
3. `stylocamion.com/administracion/estadisticas` no respondió dentro de 15
   segundos durante la auditoría y debe revisarse.
4. No se detectaron referencias al dominio viejo `blog.stylocamion.com` en las
   páginas iniciales auditadas.
5. Los accesos principales entre Portada, Ventas, Cargas y Noticias respondieron
   correctamente.

## Condición de cierre

- `cuentas` y `choferes` responden 200 por HTTPS;
- todo acceso a Empleo/Choferes usa el dominio canónico;
- el panel administrativo requiere la cuenta Stylo y nunca un acceso público;
- ningún recorrido crítico termina en 4xx, 5xx, dominio temporal o versión vieja;
- la auditoría automatizada finaliza sin errores.
