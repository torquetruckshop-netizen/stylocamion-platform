import test from 'node:test';
import assert from 'node:assert/strict';
import { inferOperationUpdate, evaluateOperationUpdate, canTransitionLoad } from '../src/operation-state-machine.mjs';

test('entiende mensajes operativos frecuentes de ruta', () => {
  assert.equal(inferOperationUpdate('Voy a cargar').target_state,'EN_CAMINO_A_CARGA');
  assert.equal(inferOperationUpdate('Estoy cargando').target_state,'EN_CARGA');
  assert.equal(inferOperationUpdate('Salí cargado, ya en ruta').target_state,'EN_TRANSITO');
  assert.equal(inferOperationUpdate('Llegué a destino').target_state,'EN_DESTINO');
  assert.equal(inferOperationUpdate('Descargando').target_state,'DESCARGANDO');
  assert.equal(inferOperationUpdate('Ya descargué, quedé vacío').target_state,'ENTREGADA');
});

test('un mensaje ambiguo no se aplica automáticamente', () => {
  const inference=inferOperationUpdate('Ya cargué');
  assert.equal(inference.confidence,'MEDIUM');
  const result=evaluateOperationUpdate({currentState:'ADJUDICADA',inference});
  assert.equal(result.action,'SUGGEST');
});

test('impide saltos incompatibles aunque el texto tenga alta confianza', () => {
  const inference=inferOperationUpdate('Ya descargué, quedé vacío');
  const result=evaluateOperationUpdate({currentState:'PUBLICADA',inference});
  assert.equal(result.action,'REVIEW');
  assert.equal(result.reason,'TRANSITION_NOT_ALLOWED');
});

test('permite atajos operativos razonables ya definidos', () => {
  assert.equal(canTransitionLoad('ADJUDICADA','EN_CARGA'),true);
  assert.equal(canTransitionLoad('EN_TRANSITO','DESCARGANDO'),true);
  assert.equal(canTransitionLoad('PUBLICADA','ENTREGADA'),false);
});
