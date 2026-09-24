import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadLocationEnrichmentService } from '../src/load-location-enrichment-service.mjs';

test('persiste origen y destino confiables y audita la resolución', async () => {
  const events=[];
  const saved=[];
  const loadStore={
    async getLoad(){ return {id:'SC-GEO-1',origin:'Rafaela',destination:'Rosario'}; },
    async addEvent(event){ events.push(event); return event; }
  };
  const locationStore={
    async saveLoadLocations(id,enriched){ saved.push({id,enriched}); return {public_id:id,...enriched}; }
  };
  const resolveLocation=async query => query==='Rafaela'
    ? {status:'RESOLVED',lat:-31.25,lon:-61.49,country_code:'AR',region_name:'Santa Fe',confidence:0.98,resolution_source:'CACHE'}
    : {status:'RESOLVED',lat:-32.94,lon:-60.65,country_code:'AR',region_name:'Santa Fe',confidence:0.99,resolution_source:'PROVIDER'};

  const enrich=createLoadLocationEnrichmentService({loadStore,locationStore,resolveLocation});
  const result=await enrich({loadId:'SC-GEO-1'});

  assert.equal(result.status,'RESOLVED');
  assert.equal(saved.length,1);
  assert.equal(saved[0].enriched.origin_lat,-31.25);
  assert.equal(saved[0].enriched.destination_lon,-60.65);
  assert.equal(events[0].type,'LOAD_LOCATION_RESOLVED');
  assert.equal(events[0].payload.location_resolution_status,'RESOLVED');
});

test('una ubicación dudosa deja la carga en REVIEW', async () => {
  const loadStore={
    async getLoad(){ return {id:'SC-GEO-2',origin:'San José',destination:'Rosario'}; },
    async addEvent(event){ return event; }
  };
  let persisted=null;
  const locationStore={async saveLoadLocations(id,enriched){ persisted={id,enriched}; return persisted; }};
  const resolveLocation=async query => query==='San José'
    ? {status:'REVIEW',lat:-31,lon:-60,country_code:'AR',confidence:0.42,resolution_source:'PROVIDER'}
    : {status:'RESOLVED',lat:-32.94,lon:-60.65,country_code:'AR',confidence:0.99,resolution_source:'CACHE'};

  const enrich=createLoadLocationEnrichmentService({loadStore,locationStore,resolveLocation});
  const result=await enrich({loadId:'SC-GEO-2'});

  assert.equal(result.status,'REVIEW');
  assert.equal(persisted.enriched.location_resolution_status,'REVIEW');
  assert.equal(persisted.enriched.origin_location_confidence,0.42);
});
