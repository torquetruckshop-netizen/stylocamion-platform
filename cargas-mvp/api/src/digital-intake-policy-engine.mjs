export const DIGITAL_INTAKE_POLICY_VERSION = 'digital-intake-policy-v1';

const ALLOWED_DIRECT_SOURCES = new Set([
  'WHATSAPP_DIRECT',
  'WHATSAPP_FORWARD',
  'PWA_SHARE',
  'NATIVE_SHARE_EXTENSION',
  'MANUAL_UPLOAD'
]);

const LOAD_PATTERNS = [
  /\b(necesito|busco|hace falta|preciso)\s+(un\s+)?(camion|camión|fletero|transporte|chasis|sider|batea|semi)/i,
  /\b(carga|viaje|mercader[ií]a|cereal|ma[ií]z|soja|trigo|fertilizante)\b.*\b(para|hasta|destino|->|→)\b/i,
  /\b(tenemos|tengo|hay|ofrezco|oferta)\b.*\b(tn|ton|toneladas?|carga|viaje)\b/i,
  /\b(carga|frete|mercadoria)\b.*\b(para|até|destino|->|→)\b/i
];

const TRUCK_PATTERNS = [
  /\b(camion|camión|unidad|chasis|sider|batea|semi|tractor)\b.*\b(vac[ií]o|disponible|libre|descarga|queda)\b/i,
  /\b(busco|necesito|preciso)\s+(una\s+)?carga\b/i,
  /\b(vazio|dispon[ií]vel|procuro)\b.*\b(carga|frete|viagem)\b/i
];

const IGNORE_PATTERNS = [
  /^\s*(hola|buen d[ií]a|buenas|gracias|ok|dale|perfecto)[.!\s]*$/i,
  /\b(sticker|feliz cumple|cadena de oraci[oó]n)\b/i
];

function normalizedSource(value = '') {
  return String(value || '').trim().toUpperCase();
}

export function classifyLogisticsIntent(text = '') {
  const value = String(text || '').trim();
  if (!value || IGNORE_PATTERNS.some(pattern => pattern.test(value))) {
    return { intent: 'IRRELEVANT', confidence: value ? 0.98 : 1, matched_rules: [] };
  }
  const loadMatches = LOAD_PATTERNS.filter(pattern => pattern.test(value)).length;
  const truckMatches = TRUCK_PATTERNS.filter(pattern => pattern.test(value)).length;
  if (loadMatches === 0 && truckMatches === 0) return { intent: 'UNKNOWN', confidence: 0.35, matched_rules: [] };
  const explicitAvailability = /\b(camion|camión|unidad|chasis|sider|batea|semi|tractor)\b.*\b(vac[ií]o|disponible|libre|descarga|queda)\b/i.test(value);
  if (explicitAvailability || truckMatches > loadMatches) return { intent: 'TRUCK_AVAILABLE', confidence: Math.min(0.98, 0.72 + truckMatches * 0.1), matched_rules: ['TRUCK_SIGNAL'] };
  return { intent: 'LOAD_OFFER', confidence: Math.min(0.98, 0.72 + loadMatches * 0.1), matched_rules: ['LOAD_SIGNAL'] };
}

export function evaluateDigitalSourceAuthorization({ source, metadata = {}, authorizedGroupIds = [] } = {}) {
  const normalized = normalizedSource(source);
  if (ALLOWED_DIRECT_SOURCES.has(normalized)) {
    const explicitShare = ['WHATSAPP_FORWARD', 'PWA_SHARE', 'NATIVE_SHARE_EXTENSION', 'MANUAL_UPLOAD'].includes(normalized);
    return {
      allowed: true,
      source: normalized,
      consent_basis: explicitShare ? 'USER_EXPLICIT_SHARE' : 'USER_INITIATED_BUSINESS_CONVERSATION',
      authorization_reference: metadata.authorization_reference || null
    };
  }
  if (normalized === 'WHATSAPP_GROUP') {
    const groupId = String(metadata.whatsapp_group_id || metadata.group_id || '');
    const allowlist = new Set((authorizedGroupIds || []).map(String));
    const authorized = metadata.group_authorized === true && groupId && allowlist.has(groupId);
    return {
      allowed: Boolean(authorized),
      source: normalized,
      consent_basis: authorized ? 'AUTHORIZED_STYLO_GROUP' : null,
      authorization_reference: authorized ? metadata.authorization_reference || groupId : null,
      reason: authorized ? null : 'GROUP_NOT_AUTHORIZED'
    };
  }
  return { allowed: false, source: normalized || 'UNKNOWN', consent_basis: null, authorization_reference: null, reason: 'SOURCE_NOT_ALLOWED' };
}

export function evaluateDigitalIntake({ source, text, contentType = 'TEXT', metadata = {}, authorizedGroupIds = [] } = {}) {
  const authorization = evaluateDigitalSourceAuthorization({ source, metadata, authorizedGroupIds });
  const classification = contentType === 'AUDIO' && !String(text || '').trim()
    ? { intent: 'AWAITING_TRANSCRIPTION', confidence: 1, matched_rules: [] }
    : classifyLogisticsIntent(text);
  const shouldProcess = authorization.allowed && !['IRRELEVANT'].includes(classification.intent);
  const nextAction = !authorization.allowed
    ? 'REJECT_SOURCE'
    : classification.intent === 'LOAD_OFFER'
      ? 'NORMALIZE_LOAD'
      : classification.intent === 'TRUCK_AVAILABLE'
        ? 'UPSERT_VEHICLE_AVAILABILITY'
        : classification.intent === 'AWAITING_TRANSCRIPTION'
          ? 'TRANSCRIBE'
          : 'AI_CLASSIFY';
  return {
    policy_version: DIGITAL_INTAKE_POLICY_VERSION,
    authorization,
    classification,
    should_process: shouldProcess,
    next_action: nextAction,
    retention_class: authorization.allowed ? 'OPERATIONAL_MINIMUM' : 'REJECTED_METADATA_ONLY'
  };
}
