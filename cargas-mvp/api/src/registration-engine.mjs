import crypto from 'node:crypto';

const ADMIN_STATES = new Set(['PENDING_REVIEW','APPROVED','OBSERVED','SUSPENDED','DEACTIVATED']);

export function normalizePhone(value='') {
  const digits=String(value).replace(/\D/g,'');
  if (digits.length<8 || digits.length>15) throw Object.assign(new Error('Teléfono inválido'),{status:400});
  return `+${digits}`;
}

export function createAutomaticRegistration(input={}, now=new Date()) {
  const phone=normalizePhone(input.phone);
  const name=String(input.name || '').trim();
  const company=String(input.company || '').trim();
  const country=String(input.country || 'AR').trim().toUpperCase();
  const role=String(input.role || 'TRANSPORTISTA').trim().toUpperCase();
  const ts=now.toISOString();
  return {
    id:`USR-${crypto.randomUUID()}`,
    phone,
    name:name || null,
    company:company || null,
    country,
    role,
    access_status:'ACTIVE',
    review_status:'PENDING_REVIEW',
    registered_at:ts,
    updated_at:ts,
    reviewed_at:null,
    reviewed_by:null,
    review_note:null
  };
}

export function applyAdminReview(user, input={}, now=new Date()) {
  const reviewStatus=String(input.review_status || '').toUpperCase();
  if (!ADMIN_STATES.has(reviewStatus)) throw Object.assign(new Error('Estado administrativo inválido'),{status:400});
  const accessStatus=['SUSPENDED','DEACTIVATED'].includes(reviewStatus) ? reviewStatus : 'ACTIVE';
  return {
    ...user,
    access_status:accessStatus,
    review_status:reviewStatus,
    reviewed_at:now.toISOString(),
    reviewed_by:input.reviewed_by || 'STYLO_ADMIN',
    review_note:input.review_note || null,
    updated_at:now.toISOString()
  };
}

export function canAccessCargas(user) {
  return Boolean(user) && user.access_status==='ACTIVE';
}
