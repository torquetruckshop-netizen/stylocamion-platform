import crypto from 'node:crypto';
export const ADMIN_ACCESS_VERSION = 'admin-access-v1';
export const ADMIN_SCOPES = Object.freeze([
  'DASHBOARD_READ',
  'USERS_MANAGE',
  'LOADS_MANAGE',
  'VEHICLES_MANAGE',
  'MATCHING_MANAGE',
  'COMPLIANCE_MANAGE',
  'FINANCE_READ',
  'AI_POLICY_MANAGE',
  'AUDIT_READ'
]);

function parseAllowlist(value = '') {
  return new Set(String(value).split(',').map(item => item.trim()).filter(Boolean).map(normalizePhone));
}

function normalizePhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) throw Object.assign(new Error('Teléfono inválido'), { status: 400 });
  return `+${digits}`;
}

export function isBootstrapAdmin(user = {}, env = process.env) {
  if (!user.phone || user.access_status !== 'ACTIVE') return false;
  return parseAllowlist(env.ADMIN_PHONE_ALLOWLIST).has(normalizePhone(user.phone));
}

export function effectiveAdminAccess({ user = {}, principal = null, env = process.env } = {}) {
  const bootstrap = isBootstrapAdmin(user, env);
  const activePrincipal = principal?.status === 'ACTIVE' && principal?.user_id === user.id;
  const allowed = bootstrap || activePrincipal;
  const scopes = allowed
    ? [...new Set(activePrincipal && Array.isArray(principal.scopes) && principal.scopes.length ? principal.scopes : ADMIN_SCOPES)]
    : [];
  return {
    version: ADMIN_ACCESS_VERSION,
    allowed,
    source: bootstrap ? 'PRIVATE_BOOTSTRAP_ALLOWLIST' : activePrincipal ? 'ADMIN_PRINCIPAL' : 'NONE',
    scopes
  };
}

export function requireAdminScope(access, scope) {
  if (!access?.allowed) throw Object.assign(new Error('Acceso administrativo requerido'), { status: 403 });
  if (!access.scopes.includes(scope)) throw Object.assign(new Error(`Permiso administrativo requerido: ${scope}`), { status: 403 });
  return true;
}

export function adminAuditEvent({ actorUserId, action, targetType = null, targetId = null, metadata = {}, now = new Date() } = {}) {
  if (!actorUserId || !action) throw new Error('actorUserId y action son obligatorios');
  return {
    id: crypto.randomUUID(),
    actor_user_id: actorUserId,
    action: String(action).toUpperCase(),
    target_type: targetType,
    target_id: targetId,
    metadata,
    created_at: now.toISOString()
  };
}
