const ALLOWED_ROLES = new Set(['buyer', 'seller', 'carrier', 'load_owner', 'company', 'driver']);

export class AccountService {
  constructor({ store, clock = () => new Date() }) {
    this.store = store;
    this.clock = clock;
  }

  async bootstrap({ user, displayName, countryCode = 'AR', roles = [], termsVersion }) {
    if (!user?.id || !user.phone) throw new Error('PHONE_AUTH_REQUIRED');
    if (!termsVersion) throw new Error('TERMS_VERSION_REQUIRED');
    const normalizedRoles = [...new Set(roles)];
    if (normalizedRoles.some((role) => !ALLOWED_ROLES.has(role))) throw new Error('ROLE_INVALID');
    const now = this.clock().toISOString();
    await this.store.upsertProfile({
      userId: user.id,
      phone: user.phone,
      displayName: displayName?.trim() || null,
      countryCode,
      termsVersion,
      termsAcceptedAt: now,
      updatedAt: now,
    });
    await this.store.setRoles(user.id, normalizedRoles);
    return this.summary(user.id);
  }

  async summary(userId) {
    const summary = await this.store.getUserSummary(userId);
    if (!summary.profile) throw new Error('ACCOUNT_NOT_INITIALIZED');
    return {
      ...summary,
      freeAccess: {
        news: true,
        cargas: true,
        salesBrowse: true,
        driversJobSeeker: true,
        feriaBrowse: true,
      },
    };
  }
}
