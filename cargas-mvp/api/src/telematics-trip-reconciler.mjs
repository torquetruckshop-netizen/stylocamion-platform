import { calculateActualTripMetrics, compareEstimatedVsActual } from './telematics-engine.mjs';

export function createTelematicsTripReconciler({
  findBoundaryReading,
  getLatestEstimate = null,
  saveTripActual = null,
  refreshFuelProfile = null
} = {}) {
  if (!findBoundaryReading) throw new Error('findBoundaryReading es obligatorio');

  return async function reconcileTrip({
    load,
    vehicle,
    startedAt,
    endedAt,
    actualFuelPricePerLiter = null,
    currency = 'ARS',
    fuelCostSource = null
  } = {}) {
    if (!load?.id) throw new Error('load es obligatorio');
    if (!vehicle?.id) throw new Error('vehicle es obligatorio');
    if (!startedAt || !endedAt) throw new Error('startedAt y endedAt son obligatorios');

    const [start, end] = await Promise.all([
      findBoundaryReading({ vehicleId:vehicle.id, at:startedAt, direction:'NEAREST_BEFORE' }),
      findBoundaryReading({ vehicleId:vehicle.id, at:endedAt, direction:'NEAREST_AFTER' })
    ]);

    if (!start || !end) {
      return {
        status:'WAITING_TELEMATICS',
        load_id:load.id,
        vehicle_id:vehicle.id,
        missing_start_reading:!start,
        missing_end_reading:!end,
        actual:null,
        variance:null
      };
    }

    const actual = calculateActualTripMetrics({
      start,
      end,
      actualFuelPricePerLiter,
      currency,
      fuelCostSource
    });

    const estimate = getLatestEstimate
      ? await getLatestEstimate({ loadId:load.id, vehicleId:vehicle.id })
      : null;
    const variance = estimate ? compareEstimatedVsActual({ estimated:estimate, actual }) : null;

    const record = {
      load_id:load.id,
      load_db_id:load.db_id || null,
      vehicle_id:vehicle.id,
      provider:actual.provider,
      started_at:actual.started_at,
      ended_at:actual.ended_at,
      distance_km:actual.distance_km,
      fuel_used_l:actual.fuel_used_l,
      idling_fuel_used_l:actual.idling_fuel_used_l,
      consumption_l_100km:actual.consumption_l_100km,
      fuel_price_per_liter:actual.fuel_price_per_liter,
      fuel_cost_amount:actual.fuel_cost_amount,
      currency:actual.currency,
      fuel_cost_source:actual.fuel_cost_source,
      confidence:actual.confidence,
      status:estimate && actual.status === 'MEASURED' ? 'RECONCILED' : actual.status,
      estimated_snapshot_id:estimate?.id || estimate?.db_id || null,
      variance:variance || {},
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    };

    const saved = saveTripActual ? await saveTripActual(record) : record;
    let profile = null;
    if (actual.status === 'MEASURED' && refreshFuelProfile) {
      profile = await refreshFuelProfile({ vehicleId:vehicle.id });
    }

    return {
      status:record.status,
      load_id:load.id,
      vehicle_id:vehicle.id,
      actual:saved,
      variance,
      fuel_profile:profile
    };
  };
}
