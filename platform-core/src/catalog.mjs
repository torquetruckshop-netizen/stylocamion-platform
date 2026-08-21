const DAY = 24 * 60 * 60 * 1000;

export const PRODUCTS = Object.freeze({
  NETWORK_FREE: product({
    sku: 'network_free',
    name: 'Acceso gratuito a la Red Stylo Camión',
    amount: 0,
    entitlement: 'network.free',
    durationMs: null,
  }),
  FERIA_ADULT: product({
    sku: 'feria_person_adult',
    name: 'Entrada mayor de 18 años · Feria 2027',
    amount: 6500,
    entitlement: 'feria.person',
    qrKind: 'person',
  }),
  FERIA_MINOR: product({
    sku: 'feria_person_minor',
    name: 'Entrada menor de 18 años · Feria 2027',
    amount: 0,
    entitlement: 'feria.person.minor',
    qrKind: 'person_minor',
    requiresBirthDate: true,
  }),
  FERIA_TRUCK: product({
    sku: 'feria_vehicle_truck',
    name: 'Espacio camión · Feria 2027',
    amount: 35000,
    entitlement: 'feria.vehicle.truck',
    qrKind: 'vehicle_truck',
    launchMonth: '2026-10',
    purpose: 'exhibition_and_sale',
    includesVehicleDataSign: true,
  }),
  FERIA_CAR_PICKUP: product({
    sku: 'feria_vehicle_car_pickup',
    name: 'Espacio auto o pick-up · Feria 2027',
    amount: 20000,
    entitlement: 'feria.vehicle.car_pickup',
    qrKind: 'vehicle_car_pickup',
    launchMonth: '2026-10',
    purpose: 'exhibition_and_sale',
    includesVehicleDataSign: true,
  }),
  FERIA_MOTORCYCLE: product({
    sku: 'feria_vehicle_motorcycle',
    name: 'Espacio moto · Feria 2027',
    amount: 15000,
    entitlement: 'feria.vehicle.motorcycle',
    qrKind: 'vehicle_motorcycle',
    launchMonth: '2026-10',
    purpose: 'exhibition_and_sale',
    includesVehicleDataSign: true,
    note: 'Precio final de lanzamiento durante octubre de 2026.',
  }),
  SALES_FEATURED: product({
    sku: 'sales_featured',
    name: 'Venta destacada',
    amount: 65000,
    entitlement: 'sales.featured',
    durationMs: 365 * DAY,
  }),
  SALES_ASSISTED: product({
    sku: 'sales_assisted',
    name: 'Venta asistida',
    amount: 130000,
    entitlement: 'sales.assisted',
    durationMs: 365 * DAY,
  }),
  SALES_MANDATE: product({
    sku: 'sales_mandate',
    name: 'Venta por mandato',
    amount: 350000,
    entitlement: 'sales.mandate',
    durationMs: 120 * DAY,
  }),
  DRIVERS_PRO: product({
    sku: 'drivers_professional',
    name: 'Choferes Profesional',
    amount: 50000,
    entitlement: 'drivers.recruiter.professional',
    durationMs: 183 * DAY,
  }),
  DRIVERS_FLEET: product({
    sku: 'drivers_fleet',
    name: 'Choferes Flota',
    amount: 80000,
    entitlement: 'drivers.recruiter.fleet',
    durationMs: 365 * DAY,
  }),
  CLUB_ANNUAL: product({
    sku: 'club_annual',
    name: 'Club Stylo anual',
    amount: 35000,
    entitlement: 'club.annual',
    durationMs: 365 * DAY,
  }),
  CARGAS_FREE: product({
    sku: 'cargas_free',
    name: 'Stylo Cargas · acceso gratuito',
    amount: 0,
    entitlement: 'cargas.free',
    durationMs: null,
  }),
});

export const PRODUCT_BY_SKU = new Map(
  Object.values(PRODUCTS).map((item) => [item.sku, item]),
);

function product(input) {
  return Object.freeze({
    currency: 'ARS',
    taxIncluded: true,
    durationMs: null,
    qrKind: null,
    enabled: true,
    requiresBirthDate: false,
    note: null,
    ...input,
  });
}

export function requireProduct(sku) {
  const product = PRODUCT_BY_SKU.get(sku);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  if (!product.enabled || product.amount === null) throw new Error('PRODUCT_NOT_AVAILABLE');
  return product;
}
