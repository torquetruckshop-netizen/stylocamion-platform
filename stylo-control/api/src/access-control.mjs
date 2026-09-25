export const ControlRole = Object.freeze({
  OWNER:'OWNER',
  ADMIN:'ADMIN',
  ANALYST:'ANALYST',
  SUPPORT:'SUPPORT',
  INVESTOR:'INVESTOR'
});

const PERMISSIONS = Object.freeze({
  OWNER:new Set(['CONTROL_READ','CONTROL_WRITE','USERS_DETAIL','OPERATIONS_DETAIL','REVENUE_DETAIL','INTEGRATIONS_DETAIL','INVESTOR_VIEW']),
  ADMIN:new Set(['CONTROL_READ','CONTROL_WRITE','USERS_DETAIL','OPERATIONS_DETAIL','REVENUE_DETAIL','INTEGRATIONS_DETAIL','INVESTOR_VIEW']),
  ANALYST:new Set(['CONTROL_READ','REVENUE_DETAIL','INTEGRATIONS_DETAIL','INVESTOR_VIEW']),
  SUPPORT:new Set(['CONTROL_READ','OPERATIONS_DETAIL','INTEGRATIONS_DETAIL']),
  INVESTOR:new Set(['INVESTOR_VIEW'])
});

export function normalizeControlRole(role) {
  const value=String(role || '').toUpperCase();
  return ControlRole[value] || null;
}

export function can(role, permission) {
  const normalized=normalizeControlRole(role);
  return Boolean(normalized && PERMISSIONS[normalized]?.has(permission));
}

export function requirePermission(role, permission) {
  if (!can(role, permission)) {
    const error=new Error('Acceso no autorizado');
    error.status=403;
    error.code='CONTROL_FORBIDDEN';
    throw error;
  }
  return true;
}

export function viewForRole(role) {
  const normalized=normalizeControlRole(role);
  if (!normalized) return 'NONE';
  if (normalized === ControlRole.INVESTOR) return 'INVESTOR';
  return 'ADMIN';
}
