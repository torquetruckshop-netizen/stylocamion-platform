export class MemoryStore {
  constructor() {
    this.profiles = new Map();
    this.roles = new Map();
    this.orders = new Map();
    this.paymentEvents = new Set();
    this.entitlements = new Map();
    this.qrByHash = new Map();
    this.audit = [];
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
    this.paymentEvents.add(providerEventId);
  }

  async grantEntitlement(entitlement) {
    const key = `${entitlement.userId}:${entitlement.code}:${entitlement.orderId}`;
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

  async adminSnapshot() {
    return {
      profiles: [...this.profiles.values()].map((item) => structuredClone(item)),
      orders: [...this.orders.values()].map((item) => structuredClone(item)),
      entitlements: [...this.entitlements.values()].map((item) => structuredClone(item)),
      qr: [...this.qrByHash.values()].map(({ tokenHash, tokenCiphertext, ...item }) => structuredClone(item)),
      audit: this.audit.map((item) => structuredClone(item)),
    };
  }
}
