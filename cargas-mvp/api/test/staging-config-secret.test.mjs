import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingReadiness } from '../src/staging-config.mjs';

test('staging acepta SUPABASE_SECRET_KEY como clave de servidor',()=>{
  const r=stagingReadiness({
    SUPABASE_URL:'https://example.supabase.co',
    SUPABASE_SECRET_KEY:'sb_secret_x',
    GOOGLE_CLIENT_ID:'client',
    ADMIN_API_KEY:'admin'
  });
  assert.equal(r.ready,true);
  assert.equal(r.missing_required.includes('SUPABASE_SERVER_KEY'),false);
});
