import test from 'node:test';
import assert from 'node:assert/strict';
import { googleProfileFromClaims, verifyGoogleCredential, googlePatch } from '../src/google-identity.mjs';
import { createAutomaticRegistration, linkAuthMethod } from '../src/registration-engine.mjs';
import { MemoryStore } from '../src/store.mjs';

test('convierte claims verificados de Google en perfil Stylo',()=>{
  const profile=googleProfileFromClaims({
    sub:'google-123',
    email:'usuario@example.com',
    email_verified:true,
    name:'Usuario Piloto',
    picture:'https://example.com/avatar.png'
  });
  assert.equal(profile.subject,'google-123');
  assert.equal(profile.email_verified,true);
  assert.equal(profile.name,'Usuario Piloto');
});

test('verifica credencial usando verificador inyectado',async()=>{
  const profile=await verifyGoogleCredential('token-demo',{
    clientId:'client-demo',
    verifyIdToken:async({idToken,audience})=>{
      assert.equal(idToken,'token-demo');
      assert.equal(audience,'client-demo');
      return {sub:'google-456',email:'piloto@example.com',email_verified:true,name:'Piloto'};
    }
  });
  assert.equal(profile.subject,'google-456');
  assert.equal(profile.email,'piloto@example.com');
});

test('vincula Google a usuario existente sin duplicarlo',()=>{
  const store=new MemoryStore({users:[]});
  const user=createAutomaticRegistration({phone:'+54 9 343 555 1212'});
  store.addUser(user);
  const profile=googleProfileFromClaims({sub:'google-789',email:'x@example.com',email_verified:true,name:'X'});
  const updated=linkAuthMethod(user,'GOOGLE',googlePatch(profile));
  store.updateUser(user.id,updated);
  assert.equal(store.getUserByGoogleSub('google-789').id,user.id);
  assert.deepEqual(updated.auth_methods.sort(),['GOOGLE','PHONE']);
  assert.equal(store.listUsers().length,1);
});
