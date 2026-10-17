import crypto from 'node:crypto';

const DAY_MS = 24 * 60 * 60 * 1000;

export function hashSessionToken(token='') {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function createPersistentSession(userId, input={}, now=new Date()) {
  if (!userId) throw Object.assign(new Error('userId es obligatorio'), {status:400});
  const remember = input.remember !== false;
  const idleDays = Number(input.idle_days || process.env.SESSION_IDLE_DAYS || (remember ? 365 : 7));
  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + idleDays * DAY_MS).toISOString();
  return {
    token,
    session: {
      id:`SES-${crypto.randomUUID()}`,
      user_id:userId,
      token_hash:hashSessionToken(token),
      device_label:input.device_label || null,
      platform:input.platform || null,
      remember,
      created_at:createdAt,
      last_seen_at:createdAt,
      expires_at:expiresAt,
      revoked_at:null,
      revoke_reason:null
    }
  };
}

export function isSessionUsable(session, now=new Date()) {
  if (!session || session.revoked_at) return false;
  return new Date(session.expires_at).getTime() > now.getTime();
}

export function touchPersistentSession(session, now=new Date()) {
  if (!isSessionUsable(session, now)) return session;
  const idleDays = Number(process.env.SESSION_IDLE_DAYS || (session.remember ? 365 : 7));
  return {
    ...session,
    last_seen_at:now.toISOString(),
    expires_at:new Date(now.getTime() + idleDays * DAY_MS).toISOString()
  };
}

export function revokeSession(session, reason='USER_LOGOUT', now=new Date()) {
  if (!session) return null;
  return {
    ...session,
    revoked_at:now.toISOString(),
    revoke_reason:reason
  };
}
