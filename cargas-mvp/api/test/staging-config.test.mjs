import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingReadiness, assertStagingReady } from '../src/staging-config.mjs';

test('staging detecta faltantes críticos',()=>{
  const r=stagingReadiness({});
  assert.equal(r.ready,false);
  assert.ok(r.missing_required.includes('SUPABASE_URL'));
  assert.equal(r.integrations.whatsapp.ready,false);
  assert.equal(r.integrations.google.ready,false);
});

test('staging base puede quedar listo aunque Google/WhatsApp/OpenAI aún no estén conectados',()=>{
  const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',ADMIN_API_KEY:'admin'};
  const r=assertStagingReady(env);
  assert.equal(r.ready,true);
  assert.equal(r.integrations.google.ready,false);
  assert.equal(r.integrations.whatsapp.ready,false);
  assert.equal(r.integrations.openai.ready,false);
});

test('readiness marca integraciones completas',()=>{
  const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',GOOGLE_CLIENT_ID:'client',ADMIN_API_KEY:'admin',WHATSAPP_PHONE_NUMBER_ID:'1',WHATSAPP_BUSINESS_ACCOUNT_ID:'2',WHATSAPP_VERIFY_TOKEN:'3',WHATSAPP_ACCESS_TOKEN:'4',OPENAI_API_KEY:'5',OPENAI_MODEL:'gpt'};
  const r=stagingReadiness(env);
  assert.equal(r.integrations.google.ready,true);
  assert.equal(r.integrations.whatsapp.ready,true);
  assert.equal(r.integrations.openai.ready,true);
});
