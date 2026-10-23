const DEFAULT_THRESHOLDS = Object.freeze({
  goodMarginPercent: 15,
  tightMarginPercent: 5,
});

export function analyzeTrip(input, thresholds = DEFAULT_THRESHOLDS) {
  const offeredAmount = positive(input.offeredAmount, 'OFFERED_AMOUNT_INVALID');
  const loadedKm = positive(input.loadedKm, 'LOADED_KM_INVALID');
  const emptyKm = nonNegative(input.emptyKm ?? 0, 'EMPTY_KM_INVALID');
  const fuelPricePerLiter = positive(input.fuelPricePerLiter, 'FUEL_PRICE_INVALID');
  const kmPerLiter = positive(input.kmPerLiter, 'CONSUMPTION_INVALID');
  const tolls = nonNegative(input.tolls ?? 0, 'TOLLS_INVALID');
  const driverCost = nonNegative(input.driverCost ?? 0, 'DRIVER_COST_INVALID');
  const otherTripCosts = nonNegative(input.otherTripCosts ?? 0, 'OTHER_COSTS_INVALID');
  const fixedCostPerKm = nonNegative(input.fixedCostPerKm ?? 0, 'FIXED_COST_INVALID');

  const totalKm = loadedKm + emptyKm;
  const liters = totalKm / kmPerLiter;
  const fuelCost = liters * fuelPricePerLiter;
  const fixedCosts = totalKm * fixedCostPerKm;
  const totalCost = fuelCost + tolls + driverCost + otherTripCosts + fixedCosts;
  const contribution = offeredAmount - totalCost;
  const marginPercent = offeredAmount === 0 ? 0 : (contribution / offeredAmount) * 100;
  const costPerKm = totalCost / totalKm;
  const revenuePerLoadedKm = offeredAmount / loadedKm;

  return {
    currency: input.currency ?? 'ARS',
    offeredAmount: money(offeredAmount),
    loadedKm: number(loadedKm),
    emptyKm: number(emptyKm),
    totalKm: number(totalKm),
    litersEstimated: number(liters),
    costs: {
      fuel: money(fuelCost),
      tolls: money(tolls),
      driver: money(driverCost),
      other: money(otherTripCosts),
      fixed: money(fixedCosts),
      total: money(totalCost),
    },
    costPerKm: money(costPerKm),
    revenuePerLoadedKm: money(revenuePerLoadedKm),
    contribution: money(contribution),
    marginPercent: number(marginPercent),
    verdict: verdictFor(marginPercent, thresholds),
  };
}

export function analyzeRoundTrip({ outbound, returnTrip = null, shared = {} }) {
  const outboundResult = analyzeTrip({ ...shared, ...outbound });
  if (!returnTrip) {
    return {
      outbound: outboundResult,
      returnTrip: null,
      combined: outboundResult,
      warning: 'RETURN_TRIP_NOT_INCLUDED',
    };
  }

  const returnResult = analyzeTrip({ ...shared, ...returnTrip });
  const offeredAmount = outboundResult.offeredAmount + returnResult.offeredAmount;
  const totalCost = outboundResult.costs.total + returnResult.costs.total;
  const totalKm = outboundResult.totalKm + returnResult.totalKm;
  const contribution = offeredAmount - totalCost;
  const marginPercent = (contribution / offeredAmount) * 100;

  return {
    outbound: outboundResult,
    returnTrip: returnResult,
    combined: {
      currency: outboundResult.currency,
      offeredAmount: money(offeredAmount),
      totalKm: number(totalKm),
      totalCost: money(totalCost),
      costPerKm: money(totalCost / totalKm),
      contribution: money(contribution),
      marginPercent: number(marginPercent),
      verdict: verdictFor(marginPercent, DEFAULT_THRESHOLDS),
    },
    warning: null,
  };
}

export function minimumPriceForTargetMargin({ totalCost, targetMarginPercent }) {
  const cost = positive(totalCost, 'TOTAL_COST_INVALID');
  const target = nonNegative(targetMarginPercent, 'TARGET_MARGIN_INVALID');
  if (target >= 100) throw new Error('TARGET_MARGIN_INVALID');
  return money(cost / (1 - target / 100));
}

function verdictFor(marginPercent, thresholds) {
  if (marginPercent >= thresholds.goodMarginPercent) return 'CONVIENE';
  if (marginPercent >= thresholds.tightMarginPercent) return 'AJUSTADO';
  return 'NO_CONVIENE';
}

function positive(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(code);
  return parsed;
}

function nonNegative(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function number(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
