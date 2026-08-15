import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocationResolver, enrichLoadLocations, locationQueryKey } from '../src/location-resolution-service.mjs';

function cacheStore() {
  const map = new Map();
  return {
    async getLocationResolution(key){ return map.get(key) || null; },
    async saveLocationResolution(value){ map.set(value.query_key,value); return value; }
  };
}

test('normaliza clave de localidad para reutilizar cache', () => {
  assert.equal(locationQueryKey('  Paraná  ','AR'),'ar|parana');
});

test('resuelve una localidad una vez y luego reutiliza cache', async () => {
  const store = cacheStore();
  let calls = 0;
  const resolve = createLocationResolver({
    store,
    geocode:async ({query}) => {
      calls++;
      return { canonical_name:query, country_code:'AR', region_name:'Entre Ríos', lat:-31.744, lon:-60.517, confidence:.96, provider:'TEST' };
    }
  });

  const first = await resolve('Paraná');
  const second = await resolve('Parana');
  assert.equal(first.status,'RESOLVED');
  assert.equal(second.status,'RESOLVED');
  assert.equal(second.resolution_source,'CACHE');
  assert.equal(calls,1);
});

test('baja confianza geográfica requiere revisión', async () => {
  const resolve = createLocationResolver({
    store:cacheStore(),
    minimumConfidence:.70,
    geocode:async () => ({ canonical_name:'San José', country_code:'AR', lat:-32, lon:-60, confidence:.42, provider:'TEST' })
  });
  const result = await resolve('San José');
  assert.equal(result.status,'REVIEW');
});

test('enriquece origen y destino y marca carga resuelta', async () => {
  const resolve = async query => query === 'Rafaela'
    ? { status:'RESOLVED', lat:-31.25, lon:-61.49, confidence:.95, country_code:'AR', region_name:'Santa Fe', resolution_source:'CACHE' }
    : { status:'RESOLVED', lat:-32.95, lon:-60.66, confidence:.97, country_code:'AR', region_name:'Santa Fe', resolution_source:'PROVIDER' };
  const load = await enrichLoadLocations({ id:'L1', origin:'Rafaela', destination:'Rosario' }, resolve);
  assert.equal(load.location_resolution_status,'RESOLVED');
  assert.equal(load.origin_lat,-31.25);
  assert.equal(load.destination_lon,-60.66);
});
