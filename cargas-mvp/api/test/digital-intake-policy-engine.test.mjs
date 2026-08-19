import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLogisticsIntent, evaluateDigitalIntake } from '../src/digital-intake-policy-engine.mjs';

test('detecta una carga que necesita camión', () => {
  const result = classifyLogisticsIntent('Tengo 28 tn de maíz en Rafaela para Rosario. Necesito chasis con acoplado.');
  assert.equal(result.intent, 'LOAD_OFFER');
  assert.ok(result.confidence >= 0.8);
});

test('detecta un camión vacío que busca carga', () => {
  const result = classifyLogisticsIntent('Camión sider queda vacío hoy en Córdoba y busca carga para Santa Fe');
  assert.equal(result.intent, 'TRUCK_AVAILABLE');
});

test('acepta un mensaje compartido explícitamente por el usuario', () => {
  const result = evaluateDigitalIntake({
    source: 'PWA_SHARE',
    text: 'Carga Rosario a Paraná, 25 tn, necesito camión',
    metadata: { authorization_reference: 'share-session-1' }
  });
  assert.equal(result.authorization.allowed, true);
  assert.equal(result.authorization.consent_basis, 'USER_EXPLICIT_SHARE');
  assert.equal(result.next_action, 'NORMALIZE_LOAD');
});

test('rechaza grupo externo que no fue autorizado', () => {
  const result = evaluateDigitalIntake({
    source: 'WHATSAPP_GROUP',
    text: 'Carga Rosario a Córdoba',
    metadata: { whatsapp_group_id: 'G-EXTERNO', group_authorized: false },
    authorizedGroupIds: ['G-STYLO']
  });
  assert.equal(result.authorization.allowed, false);
  assert.equal(result.next_action, 'REJECT_SOURCE');
  assert.equal(result.retention_class, 'REJECTED_METADATA_ONLY');
});

test('acepta únicamente un grupo Stylo expresamente autorizado', () => {
  const result = evaluateDigitalIntake({
    source: 'WHATSAPP_GROUP',
    text: 'Preciso transporte para carga de cereal a Rosario',
    metadata: { whatsapp_group_id: 'G-STYLO', group_authorized: true, authorization_reference: 'POL-77' },
    authorizedGroupIds: ['G-STYLO']
  });
  assert.equal(result.authorization.allowed, true);
  assert.equal(result.authorization.consent_basis, 'AUTHORIZED_STYLO_GROUP');
});

test('audio autorizado pasa primero por transcripción', () => {
  const result = evaluateDigitalIntake({ source: 'WHATSAPP_DIRECT', contentType: 'AUDIO' });
  assert.equal(result.next_action, 'TRANSCRIBE');
});
