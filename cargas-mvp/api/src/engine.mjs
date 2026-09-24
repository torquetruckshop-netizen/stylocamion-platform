import crypto from 'node:crypto';

const EQUIPMENT = [
  ['chasis + acoplado', /chasis(?:\s*(?:y|\+)\s*acoplado)?/i],
  ['sider', /\bsider\b/i],
  ['batea', /\bbatea(?:s)?\b/i],
  ['semirremolque', /\bsemi(?:rremolque)?\b/i],
  ['furgón', /\bfurg[oó]n\b/i]
];

const CARGO = [
  ['maíz', /\bma[ií]z\b/i],
  ['soja', /\bsoja\b/i],
  ['fertilizante', /\bfertilizante(?:s)?\b/i],
  ['trigo', /\btrigo\b/i],
  ['cereal', /\bcereal(?:es)?\b/i]
];

export function normalizeSource(source='OTHER') {
  return String(source).toUpperCase();
}

export function normalizeIntake(input, now = new Date()) {
  const raw = String(input.raw_text || '').trim();
  const source = normalizeSource(input.source);
  const arrow = extractRoute(raw);
  const weight = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:t|tn|ton|toneladas?)/i);
  const equipment = EQUIPMENT.find(([, rx]) => rx.test(raw))?.[0] ?? null;
  const cargo = CARGO.find(([, rx]) => rx.test(raw))?.[0] ?? 'carga general';
  const pickupAt = inferPickupAt(raw, input.received_at ?? now.toISOString());

  const missing = [];
  if (!arrow?.origin) missing.push('origin');
  if (!arrow?.destination) missing.push('destination');
  if (!equipment) missing.push('equipment_required');

  return {
    id: `SC-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
    source,
    sender_id: input.sender_id ?? null,
    raw_text: raw,
    origin: arrow?.origin ?? null,
    destination: arrow?.destination ?? null,
    cargo_type: cargo,
    weight_tn: weight ? Number(weight[1].replace(',', '.')) : null,
    equipment_required: equipment,
    pickup_at: pickupAt,
    status: missing.length ? 'EN_VALIDACION' : 'PUBLICADA',
    traffic_light: missing.length ? 'YELLOW' : 'GREEN',
    missing_fields: missing,
    created_at: input.received_at ?? now.toISOString(),
    assigned_vehicle_id: null,
    assigned_carrier_id: null
  };
}

function extractRoute(raw) {
  const patterns = [
    /\ben\s+([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)\s+para\s+([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)(?=,|\.|\b\d+\s*(?:t|tn|ton)|\b(?:hoy|mañana|manana)\b|$)/iu,
    /(?:^|\b)(?:desde|de)\s+([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)\s+(?:a|hasta)\s+([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)(?=,|\.|\b\d+\s*(?:t|tn|ton)|\b(?:hoy|mañana|manana)\b|$)/iu,
    /([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)\s*(?:→|->|\bhasta\b|\ba\b)\s*([A-ZÁÉÍÓÚÑ][\p{L} .'-]{2,40}?)(?=,|\.|\b\d+\s*(?:t|tn|ton)|\b(?:hoy|mañana|manana)\b|$)/iu
  ];
  for (const rx of patterns) {
    const m = raw.match(rx);
    if (m) return {origin:m[1].trim(), destination:m[2].trim()};
  }
  return null;
}

function inferPickupAt(raw, receivedAt) {
  if (!/\b(?:hoy|ma(?:ñ|n)ana)\b/i.test(raw)) return null;
  const dateMatch = String(receivedAt).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return null;
  const offsetMatch = String(receivedAt).match(/(Z|[+-]\d{2}:\d{2})$/);
  const offset = offsetMatch?.[1] || '-03:00';
  const base = new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2])-1, Number(dateMatch[3]), 12));
  if (/\bma(?:ñ|n)ana\b/i.test(raw)) base.setUTCDate(base.getUTCDate()+1);
  const datePart = base.toISOString().slice(0,10);
  const hour = raw.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(?:h|hs|horas)?\b/);
  const hh = String(hour ? Number(hour[1]) : 0).padStart(2,'0');
  const mm = String(hour ? Number(hour[2] || 0) : 0).padStart(2,'0');
  const suffix = offset === 'Z' ? 'Z' : offset;
  return new Date(`${datePart}T${hh}:${mm}:00${suffix}`).toISOString();
}

export function documentTrafficLight(checks=[]) {
  if (checks.some(c => ['EXPIRED','MISSING'].includes(c.status))) return 'RED';
  if (checks.some(c => c.status === 'EXPIRING')) return 'YELLOW';
  return 'GREEN';
}

export function scoreVehicle(load, vehicle, carrier, distanceKm) {
  const equipmentScore = sameEquipment(load.equipment_required, vehicle.equipment_type) ? 100 : 0;
  const documentsScore = vehicle.document_state === 'GREEN' ? 100 : vehicle.document_state === 'YELLOW' ? 60 : 0;
  const availabilityScore = vehicle.availability === 'AVAILABLE' ? 100 : 0;
  const distanceScore = Math.max(0, Math.round(100 - (distanceKm / 300) * 100));
  const reputationScore = Math.max(0, Math.min(100, Math.round((carrier.reputation_score || 0) * 20)));
  const total = equipmentScore * .30 + documentsScore * .20 + availabilityScore * .20 + distanceScore * .20 + reputationScore * .10;
  return {
    load_id: load.id,
    vehicle_id: vehicle.id,
    carrier_id: carrier.id,
    distance_km: Number(distanceKm.toFixed(1)),
    equipment_score: equipmentScore,
    documents_score: documentsScore,
    availability_score: availabilityScore,
    distance_score: distanceScore,
    reputation_score: reputationScore,
    total_score: Math.round(total),
    decision: 'CANDIDATE'
  };
}

function sameEquipment(required, actual) {
  if (!required || !actual) return false;
  return required.toLowerCase() === actual.toLowerCase();
}

export function haversineKm(a, b) {
  if (!a || !b) return 9999;
  const R = 6371;
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
