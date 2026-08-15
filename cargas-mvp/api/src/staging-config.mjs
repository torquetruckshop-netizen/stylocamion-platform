const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'ADMIN_API_KEY'
];

const OPTIONAL_INTEGRATIONS = {
  whatsapp: ['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_ACCESS_TOKEN'],
  openai: ['OPENAI_API_KEY','OPENAI_MODEL']
};

export function stagingReadiness(env=process.env) {
  const missingRequired = REQUIRED.filter(k => !String(env[k] || '').trim());
  const integrations = Object.fromEntries(Object.entries(OPTIONAL_INTEGRATIONS).map(([name, keys]) => {
    const missing = keys.filter(k => !String(env[k] || '').trim());
    return [name, { ready: missing.length === 0, missing }];
  }));
  return {
    ready: missingRequired.length === 0,
    missing_required: missingRequired,
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
