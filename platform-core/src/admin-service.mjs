import { randomUUID } from 'node:crypto';
import { hashQrToken } from './qr.mjs';

export class AdminService {
  constructor({ store, adminIds = new Set(), clock = () => new Date() }) {
    this.store = store;
    this.adminIds = adminIds;
    this.clock = clock;
  }

  async requireAdmin(actorId) {
    if (!actorId) throw new Error('ADMIN_REQUIRED');
    if (this.adminIds.has(actorId)) return;
    if (typeof this.store.isAdmin === 'function' && await this.store.isAdmin(actorId)) return;
    throw new Error('ADMIN_REQUIRED');
  }

  async snapshot(actorId) {
    await this.requireAdmin(actorId);
    return this.store.adminSnapshot();
  }

  async redeemQr({ actorId, token }) {
    await this.requireAdmin(actorId);
    const result = await this.store.redeemQr(hashQrToken(token), actorId, this.clock());
    await this.store.appendAudit({
      id: randomUUID(),
      actorId,
      action: 'qr.redeem',
      target: result.credential?.id ?? null,
      result: result.ok ? 'approved' : result.reason,
      createdAt: this.clock().toISOString(),
    });
    return result;
  }
}
