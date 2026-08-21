import { createHash, randomBytes } from 'node:crypto';

export class SupabaseAuth {
  constructor({ supabaseUrl, anonKey, fetchImpl = fetch }) {
    if (!supabaseUrl || !anonKey) throw new Error('SUPABASE_AUTH_CONFIG_REQUIRED');
    this.supabaseUrl = supabaseUrl.replace(/\/$/, '');
    this.anonKey = anonKey;
    this.fetch = fetchImpl;
  }

  async authenticate(request) {
    const token = bearerToken(request.headers.get('authorization'));
    if (!token) throw new Error('AUTH_REQUIRED');
    const response = await this.fetch(`${this.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: this.anonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('AUTH_INVALID');
    const user = await response.json();
    return {
      id: user.id,
      phone: user.phone ?? null,
      metadata: user.user_metadata ?? {},
    };
  }
}

export class PlatformAuth {
  constructor({ supabaseAuth, store, cookieName = 'stylo-platform-auth', sessionDays = 30, clock = () => new Date() }) {
    this.supabaseAuth = supabaseAuth;
    this.store = store;
    this.cookieName = cookieName;
    this.sessionDays = sessionDays;
    this.clock = clock;
  }

  async authenticate(request) {
    if (bearerToken(request.headers.get('authorization'))) {
      return this.supabaseAuth.authenticate(request);
    }
    const token = cookieToken(request.headers.get('cookie'), this.cookieName);
    if (!token) throw new Error('AUTH_REQUIRED');
    const session = await this.store.getSession(hashSessionToken(token));
    if (!session || session.revokedAt || new Date(session.expiresAt) <= this.clock()) {
      throw new Error('AUTH_INVALID');
    }
    return { id: session.userId, phone: session.phone, metadata: {} };
  }

  async createSession(request) {
    const user = await this.supabaseAuth.authenticate(request);
    const token = randomBytes(32).toString('base64url');
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.sessionDays * 86400000);
    await this.store.saveSession({
      tokenHash: hashSessionToken(token), userId: user.id, phone: user.phone,
      createdAt: now.toISOString(), expiresAt: expiresAt.toISOString(), revokedAt: null,
    });
    return { user, token, expiresAt };
  }

  async revokeSession(request) {
    const token = cookieToken(request.headers.get('cookie'), this.cookieName);
    if (token) await this.store.revokeSession(hashSessionToken(token), this.clock());
  }
}

export class StaticAuth {
  constructor(users = new Map()) {
    this.users = users;
  }

  async authenticate(request) {
    const token = bearerToken(request.headers.get('authorization'));
    const user = this.users.get(token);
    if (!user) throw new Error('AUTH_INVALID');
    return structuredClone(user);
  }
}

function bearerToken(value) {
  const match = String(value ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function cookieToken(value, cookieName) {
  const cookies = String(value ?? '').split(';');
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split('=');
    if (name === cookieName) return decodeURIComponent(parts.join('='));
  }
  return null;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
