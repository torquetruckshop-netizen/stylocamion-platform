import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCounterpartyTrustProfile,canAutoTransact} from '../src/counterparty-trust-engine.mjs';

test('contraparte con historial sano habilita automatización',()=>{
 const p=buildCounterpartyTrustProfile({completed_operations:30,cancellations:1,disputes:0,late_payments:0,documents_valid:true,identity_verified:true,average_payment_days:12});
 assert.ok(p.trust_score>=70);
 assert.equal(canAutoTransact(p).allowed,true);
});

test('documentación inválida bloquea aunque haya historial',()=>{
 const p=buildCounterpartyTrustProfile({completed_operations:100,documents_valid:false,identity_verified:true});
 assert.equal(canAutoTransact(p).allowed,false);
 assert.equal(canAutoTransact(p).reason,'DOCUMENTS_NOT_VALID');
});
