import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigins, corsHeaders, isOriginAllowed } from '../src/http-security.mjs';

test('acepta lista explícita de orígenes de staging',()=>{
  const env={STAGING_ALLOWED_ORIGINS:'https://cargas-staging.stylocamion.com, https://app-staging.stylocamion.com'};
  assert.deepEqual(allowedOrigins(env),['https://cargas-staging.stylocamion.com','https://app-staging.stylocamion.com']);
  const req={headers:{origin:'https://cargas-staging.stylocamion.com'}};
  const headers=corsHeaders(req,env);
  assert.equal(headers['access-control-allow-origin'],'https://cargas-staging.stylocamion.com');
  assert.equal(headers['access-control-allow-credentials'],'true');
  assert.equal(isOriginAllowed(req,env),true);
});

test('no habilita CORS para origen desconocido',()=>{
  const env={STAGING_ALLOWED_ORIGINS:'https://cargas-staging.stylocamion.com'};
  const req={headers:{origin:'https://example.com'}};
  assert.deepEqual(corsHeaders(req,env),{});
  assert.equal(isOriginAllowed(req,env),false);
});

test('requests server-to-server sin Origin siguen permitidos',()=>{
  assert.equal(isOriginAllowed({headers:{}},{}),true);
});
