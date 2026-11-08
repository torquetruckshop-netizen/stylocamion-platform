export const DEFAULT_OPERATION_CHANNEL = 'CARGAS_OP_01';

export function resolveOperationChannel(input = {}) {
  const code = String(input.operation_channel_code || DEFAULT_OPERATION_CHANNEL).trim().toUpperCase();
  return code || DEFAULT_OPERATION_CHANNEL;
}

export function attachOperationChannel(record, input = {}) {
  return {
    ...record,
    operation_channel_code: resolveOperationChannel(input)
  };
}

export function responseRoute(load = {}) {
  return {
    operation_channel_code: load.operation_channel_code || DEFAULT_OPERATION_CHANNEL,
    sender_id: load.sender_id || null
  };
}
