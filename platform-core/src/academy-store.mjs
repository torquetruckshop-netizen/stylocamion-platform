// Small, bounded pilot documents. CAS protects concurrent enrollment and attempts.
export class MemoryAcademyStore {
  constructor(accountStore) { this.accountStore = accountStore; this.organizations = new Map(); }
  getUserSummary(userId) { return this.accountStore.getUserSummary(userId); }
  async createAcademyOrganization(org) { this.organizations.set(org.id, structuredClone(org)); }
  async getAcademyOrganization(id) { return structuredClone(this.organizations.get(id) ?? null); }
  async listAcademyOrganizations(userId) {
    return structuredClone([...this.organizations.values()].filter((org) => org.ownerId === userId || org.members[userId]?.active));
  }
  async compareAndSwapAcademy(org, revision) {
    if (this.organizations.get(org.id)?.revision !== revision) return false;
    this.organizations.set(org.id, structuredClone({ ...org, revision: revision + 1 }));
    return true;
  }
}

export class SupabaseAcademyStore {
  constructor(accountStore) { this.accountStore = accountStore; }
  getUserSummary(userId) { return this.accountStore.getUserSummary(userId); }
  async createAcademyOrganization(org) {
    await this.accountStore.request('platform_academy_flota', { method: 'POST', prefer: 'return=minimal',
      body: { id: org.id, owner_id: org.ownerId, revision: 0, document: org } });
  }
  async getAcademyOrganization(id) {
    const rows = await this.accountStore.request('platform_academy_flota', { query: { id: `eq.${id}`, select: 'document', limit: 1 } });
    return rows[0]?.document ?? null;
  }
  async listAcademyOrganizations(userId) {
    const rows = await this.accountStore.request('rpc/platform_academy_for_user', { method: 'POST', body: { actor_id: userId } });
    return rows.map((row) => row.document);
  }
  async compareAndSwapAcademy(org, revision) {
    return await this.accountStore.request('rpc/platform_academy_cas', { method: 'POST',
      body: { org_id: org.id, expected_revision: revision, next_document: { ...org, revision: revision + 1 } } });
  }
}
