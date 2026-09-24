export class MemoryStore {
  constructor() {
    this.profiles = new Map();
    this.roles = new Map();
    this.orders = new Map();
    this.paymentEvents = new Set();
    this.entitlements = new Map();
    this.qrByHash = new Map();
    this.audit = [];
    this.sessions = new Map();
    this.pageviews = [];
  }

  async upsertProfile(profile) {
    this.profiles.set(profile.userId, structuredClone(profile));
    return structuredClone(profile);
  }

  async setRoles(userId, roles) {
    this.roles.set(userId, [...roles]);
    return [...roles];
  }

  async getUserSummary(userId) {
    return {
      profile: structuredClone(this.profiles.get(userId) ?? null),
      roles: [...(this.roles.get(userId) ?? [])],
      orders: [...this.orders.values()].filter((item) => item.userId === userId).map((item) => structuredClone(item)),
      entitlements: [...this.entitlements.values()].filter((item) => item.userId === userId).map((item) => structuredClone(item)),
      qr: [...this.qrByHash.values()]
        .filter((item) => this.orders.get(item.orderId)?.userId === userId)
        .map(({ tokenHash, tokenCiphertext, ...item }) => structuredClone(item)),
    };
  }

  async createOrder(order) {
    this.orders.set(order.id, structuredClone(order));
    return structuredClone(order);
  }

  async getOrder(id) {
    const order = this.orders.get(id);
    return order ? structuredClone(order) : null;
  }

  async saveOrder(order) {
    this.orders.set(order.id, structuredClone(order));
    return structuredClone(order);
  }

  async hasPaymentEvent(providerEventId) {
    return this.paymentEvents.has(providerEventId);
  }

  async recordPaymentEvent(providerEventId) {
    if (this.paymentEvents.has(providerEventId)) return false;
    this.paymentEvents.add(providerEventId);
    return true;
  }

  async releasePaymentEvent(providerEventId) {
    this.paymentEvents.delete(providerEventId);
  }

  async grantEntitlement(entitlement) {
    const key = `${entitlement.userId}:${entitlement.code}:${entitlement.orderId}`;
    const existing = this.entitlements.get(key);
    if (existing) return structuredClone(existing);
    this.entitlements.set(key, structuredClone(entitlement));
    return structuredClone(entitlement);
  }

  async revokeOrderBenefits(orderId, now = new Date()) {
    for (const [key, value] of this.entitlements) {
      if (value.orderId === orderId) {
        value.status = 'revoked';
        value.revokedAt = now.toISOString();
        this.entitlements.set(key, value);
      }
    }
    for (const [hash, credential] of this.qrByHash) {
      if (credential.orderId === orderId && credential.status === 'valid') {
        credential.status = 'revoked';
        credential.revokedAt = now.toISOString();
        this.qrByHash.set(hash, credential);
      }
    }
  }

  async saveQr(credential) {
    const existing = [...this.qrByHash.values()].find(
      (item) => item.orderId === credential.orderId && item.kind === credential.kind,
    );
    if (existing) return structuredClone(existing);
    this.qrByHash.set(credential.tokenHash, structuredClone(credential));
    return structuredClone(credential);
  }

  async getQrByOrder(orderId) {
    const credential = [...this.qrByHash.values()].find((item) => item.orderId === orderId);
    return credential ? structuredClone(credential) : null;
  }

  async redeemQr(tokenHash, actorId, now = new Date()) {
    const credential = this.qrByHash.get(tokenHash);
    if (!credential) return { ok: false, reason: 'not_found' };
    if (credential.status !== 'valid') return { ok: false, reason: credential.status };
    credential.status = 'used';
    credential.usedAt = now.toISOString();
    credential.usedBy = actorId;
    this.qrByHash.set(tokenHash, credential);
    return { ok: true, credential: structuredClone(credential) };
  }

  async appendAudit(entry) {
    this.audit.push(structuredClone(entry));
  }

  async recordPageview(pageview) {
    this.pageviews.push(structuredClone(pageview));
  }

  async adminSnapshot() {
    const now = Date.now();
    const cutoff = now - 30 * 86400000;
    const recent = this.pageviews.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
    const topPages = Object.entries(recent.reduce((acc, item) => {
      acc[item.path] = (acc[item.path] ?? 0) + 1;
      return acc;
    }, {})).sort((a,b) => b[1]-a[1]).slice(0,10).map(([path,views]) => ({ path, views }));
    return {
      profiles: [...this.profiles.values()].map((item) => structuredClone(item)),
      orders: [...this.orders.values()].map((item) => structuredClone(item)),
      entitlements: [...this.entitlements.values()].map((item) => structuredClone(item)),
      qr: [...this.qrByHash.values()].map(({ tokenHash, tokenCiphertext, ...item }) => structuredClone(item)),
      audit: this.audit.map((item) => structuredClone(item)),
      analytics: {
        periodDays: 30,
        pageviews: recent.length,
        uniqueSessions: new Set(recent.map((item) => item.sessionId)).size,
        topPages,
      },
    };
  }

  async saveSession(session) {
    this.sessions.set(session.tokenHash, structuredClone(session));
  }

  async getSession(tokenHash) {
    const session = this.sessions.get(tokenHash);
    return session ? structuredClone(session) : null;
  }

  async revokeSession(tokenHash, now = new Date()) {
    const session = this.sessions.get(tokenHash);
    if (!session) return;
    session.revokedAt = now.toISOString();
    this.sessions.set(tokenHash, session);
  }
}
