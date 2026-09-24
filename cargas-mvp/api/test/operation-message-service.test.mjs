import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.mjs';
import { createOperationMessageService } from '../src/operation-message-service.mjs';

test('descarga confirmada libera unidad y dispara continuidad', async () => {
  const load={id:'SC-OP-1',status:'DESCARGANDO',assigned_vehicle_id:'VEH-1'};
  const vehicle={id:'VEH-1',availability:'BUSY'};
  const store=new MemoryStore({loads:[load],vehicles:[vehicle]});
  const available=[];
  const delivered=[];
  const process=createOperationMessageService({
    store,
    onVehicleAvailable:async event=>available.push(event),
    onTripDelivered:async event=>delivered.push(event)
  });

  const result=await process({
    loadId:'SC-OP-1',
    text:'Ya descargué, quedé vacío',
    senderId:'DRIVER-1',
    observedAt:'2026-08-16T18:00:00Z'
  });

  assert.equal(result.status,'APPLIED');
  assert.equal(store.getLoad('SC-OP-1').status,'ENTREGADA');
  assert.equal(store.getVehicle('VEH-1').availability,'AVAILABLE');
  assert.equal(available.length,1);
  assert.equal(delivered.length,1);
  assert.equal(store.events[0].type,'OPERATION_STATE_FROM_MESSAGE');
});

test('mensaje ambiguo sólo genera sugerencia y no modifica estado', async () => {
  const load={id:'SC-OP-2',status:'ADJUDICADA'};
  const store=new MemoryStore({loads:[load]});
  const process=createOperationMessageService({store});
  const result=await process({loadId:'SC-OP-2',text:'Ya cargué'});
  assert.equal(result.status,'SUGGESTED');
  assert.equal(store.getLoad('SC-OP-2').status,'ADJUDICADA');
  assert.equal(store.events[0].type,'OPERATION_MESSAGE_SUGGESTION');
});

test('mensaje incompatible requiere revisión y no cierra la carga', async () => {
  const load={id:'SC-OP-3',status:'PUBLICADA'};
  const store=new MemoryStore({loads:[load]});
  const process=createOperationMessageService({store});
  const result=await process({loadId:'SC-OP-3',text:'Ya descargué, quedé vacío'});
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(store.getLoad('SC-OP-3').status,'PUBLICADA');
  assert.equal(store.events[0].type,'OPERATION_MESSAGE_REVIEW_REQUIRED');
});
