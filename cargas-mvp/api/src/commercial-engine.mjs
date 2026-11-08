export function calculatePlatformFee({freightAmount, ratePercent = 3, minimumFee = 0}) {
  const amount = Number(freightAmount || 0);
  const rate = Number(ratePercent || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('freightAmount inválido');
  if (!Number.isFinite(rate) || rate < 0) throw new Error('ratePercent inválido');
  const calculated = amount * (rate / 100);
  return Math.max(Number(minimumFee || 0), Math.round(calculated * 100) / 100);
}

export function revenueStateForEvent(eventType) {
  if (eventType === 'OPERATION_COMPLETED') return 'ACCRUED';
  if (eventType === 'INVOICE_ISSUED') return 'INVOICED';
  if (eventType === 'PAYMENT_CONFIRMED') return 'PAID';
  if (eventType === 'FEE_WAIVED') return 'WAIVED';
  if (eventType === 'OPERATION_CANCELLED') return 'CANCELLED';
  return 'ESTIMATED';
}

export function buildRevenueRecord({loadId, freightAmount, currency = 'ARS', ratePercent = 3, eventType}) {
  const feeAmount = calculatePlatformFee({freightAmount, ratePercent});
  return {
    load_id: loadId,
    freight_amount: Number(freightAmount),
    currency,
    platform_fee_rate: Number(ratePercent),
    platform_fee_amount: feeAmount,
    state: revenueStateForEvent(eventType),
    trigger_event: eventType,
    created_at: new Date().toISOString()
  };
}
