import { inferOperationUpdate, evaluateOperationUpdate } from './operation-state-machine.mjs';

export function createOperationMessageService({
  store,
  onVehicleAvailable = null,
  onTripDelivered = null
} = {}) {
  if (!store) throw new Error('store es obligatorio');

  return async function processOperationMessage({
    loadId,
    text,
    actor='DRIVER',
    senderId=null,
    observedAt=new Date().toISOString(),
    allowMediumConfidence=false
  } = {}) {
    if (!loadId) throw new Error('loadId es obligatorio');
    const load=await store.getLoad(loadId);
    if (!load) throw Object.assign(new Error('Carga no encontrada'),{status:404});

    const inference=inferOperationUpdate(text);
    const evaluation=evaluateOperationUpdate({
      currentState:load.status,
      inference,
      allowMediumConfidence
    });

    if (evaluation.action==='APPLY') {
      const updated=await store.updateLoad(load.id,{status:evaluation.target_state});
      await audit(store,load.id,'OPERATION_STATE_FROM_MESSAGE',actor,observedAt,{
        sender_id:senderId,
        text,
        inference,
        from:load.status,
        to:evaluation.target_state
      });

      let vehicle=null;
      if (evaluation.target_state==='ENTREGADA' && load.assigned_vehicle_id) {
        if (store.updateVehicle) vehicle=await store.updateVehicle(load.assigned_vehicle_id,{availability:'AVAILABLE'});
        if (onVehicleAvailable) {
          await onVehicleAvailable({
            load:{...load,...updated},
            vehicle_id:load.assigned_vehicle_id,
            observed_at:observedAt,
            source:'OPERATION_MESSAGE'
          });
        }
        if (onTripDelivered) {
          await onTripDelivered({
            load:{...load,...updated},
            vehicle_id:load.assigned_vehicle_id,
            delivered_at:observedAt,
            source:'OPERATION_MESSAGE'
          });
        }
      }

      return {
        status:'APPLIED',
        inference,
        evaluation,
        load:updated,
        vehicle
      };
    }

    if (evaluation.action==='SUGGEST') {
      await audit(store,load.id,'OPERATION_MESSAGE_SUGGESTION',actor,observedAt,{
        sender_id:senderId,text,inference,current_state:load.status,target_state:evaluation.target_state
      });
      return {status:'SUGGESTED',inference,evaluation,load};
    }

    if (evaluation.action==='REVIEW') {
      await audit(store,load.id,'OPERATION_MESSAGE_REVIEW_REQUIRED',actor,observedAt,{
        sender_id:senderId,text,inference,current_state:load.status,target_state:evaluation.target_state,reason:evaluation.reason
      });
      return {status:'REVIEW_REQUIRED',inference,evaluation,load};
    }

    return {
      status:evaluation.action==='NOOP'?'NO_CHANGE':'IGNORED',
      inference,
      evaluation,
      load
    };
  };
}

async function audit(store,loadId,type,actor,createdAt,payload) {
  if (!store.addEvent) return null;
  return store.addEvent({
    load_id:loadId,
    type,
    actor:['AI','STYLO','SHIPPER','CARRIER','DRIVER','SYSTEM'].includes(actor)?actor:'SYSTEM',
    created_at:createdAt,
    payload
  });
}
