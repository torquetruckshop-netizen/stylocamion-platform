import crypto from 'node:crypto';

const ALLOWED_MODULES=new Set(['PLATFORM','CARGAS','VENTAS','NOTICIAS','REVENUE','AUDIENCE','AI','TELEMATICS']);

export function normalizeControlFact(input={}){
  const occurredAt=input.occurred_at || input.occurredAt || new Date().toISOString();
  if (!Number.isFinite(new Date(occurredAt).getTime())) throw new Error('occurred_at inválido');
  const module=String(input.module || 'PLATFORM').toUpperCase();
  if (!ALLOWED_MODULES.has(module)) throw new Error('module inválido');
  const eventType=String(input.event_type || input.eventType || '').trim().toUpperCase();
  if (!eventType) throw new Error('event_type es obligatorio');
  return {
    id:input.id || crypto.randomUUID(),
    module,
    event_type:eventType,
    entity_type:input.entity_type ? String(input.entity_type).toUpperCase() : null,
    entity_id:input.entity_id ? String(input.entity_id) : null,
    value:input.value == null ? null : Number(input.value),
    currency:input.currency || null,
    status:input.status || null,
    channel:input.channel || null,
    country:input.country || null,
    dimensions:safeDimensions(input.dimensions || {}),
    occurred_at:new Date(occurredAt).toISOString(),
    recorded_at:new Date().toISOString()
  };
}

export class MemoryControlStore {
  constructor(seed={}){
    this.facts=(seed.facts || []).map(normalizeControlFact);
    this.health=new Map((seed.health || []).map(x=>[String(x.module).toUpperCase(),normalizeModuleHealth(x)]));
  }
  addFact(fact){ const normalized=normalizeControlFact(fact); this.facts.push(normalized); return normalized; }
  listFacts(){ return [...this.facts]; }
  upsertModuleHealth(item){ const normalized=normalizeModuleHealth(item); this.health.set(normalized.module,normalized); return normalized; }
  listModuleHealth(){ return [...this.health.values()].sort((a,b)=>a.module.localeCompare(b.module)); }
}

export function normalizeModuleHealth(input={}){
  const module=String(input.module || '').toUpperCase();
  if (!module) throw new Error('module es obligatorio');
  const status=String(input.status || 'UNKNOWN').toUpperCase();
  if (!['HEALTHY','DEGRADED','DOWN','UNKNOWN'].includes(status)) throw new Error('status de módulo inválido');
  return {
    module,
    status,
    detail:input.detail || null,
    latency_ms:input.latency_ms == null ? null : Number(input.latency_ms),
    last_success_at:input.last_success_at || null,
    checked_at:input.checked_at || new Date().toISOString()
  };
}

function safeDimensions(value){
  const blocked=new Set(['phone','email','name','message','raw_text','plate','dni','document','token','secret']);
  return Object.fromEntries(Object.entries(value).filter(([key])=>!blocked.has(String(key).toLowerCase())));
}
