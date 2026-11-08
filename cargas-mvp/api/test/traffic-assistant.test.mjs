import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldStartSearch, nextTrafficAction } from '../src/traffic-assistant.mjs';

test('empieza búsqueda dos horas antes de disponibilidad', () => {
  assert.equal(shouldStartSearch({
    now:'2026-08-14T13:10:00-03:00',
    availableFrom:'2026-08-14T15:00:00-03:00',
    leadMinutes:120
  }), true);
});

test('si hay match fuerte propone carga propia', () => {
  assert.deepEqual(nextTrafficAction({ opportunityCount:3, bestScore:94 }), {
    action:'PROPOSE_BEST_LOAD', target:'OWN_FLEET', priority:'HIGH'
  });
});

test('sin match fuerte escala a red privada', () => {
  assert.equal(nextTrafficAction({ opportunityCount:1, bestScore:72, privateNetworkEnabled:true }).action, 'SEARCH_PRIVATE_NETWORK');
});
