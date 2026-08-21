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
