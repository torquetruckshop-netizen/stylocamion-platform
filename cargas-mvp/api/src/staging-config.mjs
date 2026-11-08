const REQUIRED = ['SUPABASE_URL','ADMIN_API_KEY'];

const OPTIONAL_INTEGRATIONS = {
  google: ['GOOGLE_CLIENT_ID'],
  whatsapp: ['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_ACCESS_TOKEN'],
  openai: ['OPENAI_API_KEY','OPENAI_MODEL']
};

export function stagingReadiness(env=process.env) {
  const missingRequired = REQUIRED.filter(k => !String(env[k] || '').trim());
  const hasServerKey = Boolean(String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim());
  if (!hasServerKey) missingRequired.push('SUPABASE_SERVER_KEY');
  const integrations = Object.fromEntries(Object.entries(OPTIONAL_INTEGRATIONS).map(([name, keys]) => {
    const missing = keys.filter(k => !String(env[k] || '').trim());
    return [name, { ready: missing.length === 0, missing }];
  }));
  return {
    ready: missingRequired.length === 0,
    missing_required: missingRequired,
    supabase_key_mode: env.SUPABASE_SECRET_KEY ? 'SECRET_KEY' : env.SUPABASE_SERVICE_ROLE_KEY ? 'LEGACY_SERVICE_ROLE' : null,
    integrations
  };
}

export function assertStagingReady(env=process.env) {
  const result=stagingReadiness(env);
  if (!result.ready) {
    const err=new Error(`Staging incompleto: faltan ${result.missing_required.join(', ')}`);
    err.status=503;
    err.code='STAGING_CONFIG_INCOMPLETE';
    err.readiness=result;
    throw err;
  }
  return result;
}
