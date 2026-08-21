# Producción en DonWeb Cloud Node.js

Destino validado: servidor DonWeb `#6295210`, Ubuntu 24.04, IP `179.43.112.42`.

## Secuencia

1. Apuntar el registro DNS `A` de `cuentas.stylocamion.com` a `179.43.112.42`.
2. Clonar el repositorio privado con una deploy key de GitHub de solo lectura en `/opt/stylocamion`.
3. Copiar `.env.example` a `.env.production` y completar los secretos directamente en la consola, nunca en chats ni commits.
4. Ejecutar la migración `db/20260821_platform_core.sql` en Supabase.
5. Instalar/activar el proceso:

```bash
cd /opt/stylocamion/platform-core
npm install --omit=dev
npm test
npm install --global pm2
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

6. Instalar el vhost Nginx y SSL:

```bash
cp deploy/nginx-cuentas.conf /etc/nginx/sites-available/cuentas.stylocamion.com
ln -s /etc/nginx/sites-available/cuentas.stylocamion.com /etc/nginx/sites-enabled/cuentas.stylocamion.com
nginx -t
systemctl reload nginx
certbot --nginx -d cuentas.stylocamion.com
```

7. Verificar `https://cuentas.stylocamion.com/health`, acceso SMS, creación de cuenta, orden, pago, webhook, recuperación y validación de QR.

## Variables obligatorias

`NODE_ENV`, `HOST`, `PORT`, `PUBLIC_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `QR_ENCRYPTION_SECRET`, `ADMIN_USER_ID_ALLOWLIST`, `AUTH_COOKIE_DOMAIN` y `ACCOUNT_TERMS_VERSION`.
