const REQUIRED_PRODUCTION_SETTINGS = Object.freeze([
  { name: 'PUBLIC_BASE_URL', keys: ['PUBLIC_BASE_URL'] },
  { name: 'SUPABASE_URL', keys: ['SUPABASE_URL'] },
  { name: 'SUPABASE_PUBLISHABLE_KEY', keys: ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'] },
  { name: 'SUPABASE_SECRET_KEY', keys: ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] },
  { name: 'MERCADOPAGO_ACCESS_TOKEN', keys: ['MERCADOPAGO_ACCESS_TOKEN'] },
  { name: 'MERCADOPAGO_WEBHOOK_SECRET', keys: ['MERCADOPAGO_WEBHOOK_SECRET'] },
  { name: 'QR_ENCRYPTION_SECRET', keys: ['QR_ENCRYPTION_SECRET'] },
  { name: 'ADMIN_USER_ID_ALLOWLIST', keys: ['ADMIN_USER_ID_ALLOWLIST'] },
  { name: 'AUTH_COOKIE_DOMAIN', keys: ['AUTH_COOKIE_DOMAIN'] },
  { name: 'ACCOUNT_TERMS_VERSION', keys: ['ACCOUNT_TERMS_VERSION'] },
]);

export function inspectProductionConfig(env = process.env) {
  const missing = REQUIRED_PRODUCTION_SETTINGS
    .filter(({ keys }) => !keys.some((key) => present(env[key])))
    .map(({ name }) => name);
  const invalid = [];

  validateHttpsUrl(env.PUBLIC_BASE_URL, 'PUBLIC_BASE_URL', invalid);
  validateHttpsUrl(env.SUPABASE_URL, 'SUPABASE_URL', invalid);
  if (present(env.AUTH_COOKIE_DOMAIN) && !String(env.AUTH_COOKIE_DOMAIN).startsWith('.')) {
    invalid.push('AUTH_COOKIE_DOMAIN');
  }
  if (present(env.QR_ENCRYPTION_SECRET) && String(env.QR_ENCRYPTION_SECRET).length < 32) {
    invalid.push('QR_ENCRYPTION_SECRET');
  }
  if (present(env.ADMIN_USER_ID_ALLOWLIST)
      && !String(env.ADMIN_USER_ID_ALLOWLIST).split(',').some((value) => value.trim())) {
    invalid.push('ADMIN_USER_ID_ALLOWLIST');
  }

  return {
    ready: missing.length === 0 && invalid.length === 0,
    missing: [...new Set(missing)],
    invalid: [...new Set(invalid)],
  };
}

export function assertProductionConfig(env = process.env) {
  const status = inspectProductionConfig(env);
  if (status.ready) return status;
  const error = new Error('PRODUCTION_CONFIG_REQUIRED');
  error.status = status;
  throw error;
}

function validateHttpsUrl(value, name, invalid) {
  if (!present(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') invalid.push(name);
  } catch {
    invalid.push(name);
  }
}

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
