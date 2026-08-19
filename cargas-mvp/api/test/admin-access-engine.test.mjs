import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveAdminAccess, requireAdminScope, adminAuditEvent } from '../src/admin-access-engine.mjs';

test('habilita administrador bootstrap únicamente desde allowlist privada', () => {
  const user = { id: 'U1', phone: '+54 9 343 555 0001', access_status: 'ACTIVE' };
  const access = effectiveAdminAccess({ user, env: { ADMIN_PHONE_ALLOWLIST: '+5493435550001,+5493435550002' } });
  assert.equal(access.allowed, true);
  assert.equal(access.source, 'PRIVATE_BOOTSTRAP_ALLOWLIST');
  assert.ok(access.scopes.includes('USERS_MANAGE'));
});

test('bloquea usuario suspendido aunque figure en allowlist', () => {
  const user = { id: 'U1', phone: '+5493435550001', access_status: 'SUSPENDED' };
  const access = effectiveAdminAccess({ user, env: { ADMIN_PHONE_ALLOWLIST: '+5493435550001' } });
  assert.equal(access.allowed, false);
});

test('principal institucional puede usar permisos acotados', () => {
  const user = { id: 'U2', phone: '+5493435550002', access_status: 'ACTIVE' };
  const principal = { user_id: 'U2', status: 'ACTIVE', scopes: ['DASHBOARD_READ', 'AUDIT_READ'] };
  const access = effectiveAdminAccess({ user, principal, env: {} });
  assert.equal(access.allowed, true);
  assert.equal(requireAdminScope(access, 'AUDIT_READ'), true);
  assert.throws(() => requireAdminScope(access, 'USERS_MANAGE'));
});

test('cada acción administrativa produce un evento auditable', () => {
  const event = adminAuditEvent({ actorUserId: 'U1', action: 'approve_user', targetType: 'USER', targetId: 'U9', now: new Date('2026-08-19T00:00:00Z') });
  assert.equal(event.action, 'APPROVE_USER');
  assert.equal(event.target_id, 'U9');
});
