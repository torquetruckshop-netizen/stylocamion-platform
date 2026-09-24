export function allowedOrigins(env=process.env) {
  const raw=String(env.STAGING_ALLOWED_ORIGINS || env.STAGING_ALLOWED_ORIGIN || '');
  return raw.split(',').map(x=>x.trim()).filter(Boolean);
}

export function corsHeaders(req, env=process.env) {
  const origin=String(req?.headers?.origin || '').trim();
  if (!origin) return {};
  const allowed=allowedOrigins(env);
  if (!allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin':origin,
    'access-control-allow-credentials':'true',
    'vary':'Origin'
  };
}

export function isOriginAllowed(req, env=process.env) {
  const origin=String(req?.headers?.origin || '').trim();
  return !origin || allowedOrigins(env).includes(origin);
}
