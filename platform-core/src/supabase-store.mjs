const TABLES = Object.freeze({
  profiles: 'platform_profiles',
  roles: 'platform_roles',
  admins: 'platform_admins',
  orders: 'platform_orders',
  paymentEvents: 'platform_payment_events',
  entitlements: 'platform_entitlements',
  qr: 'platform_event_qr',
  audit: 'platform_admin_audit',
  sessions: 'platform_sessions',
});

export class SupabaseStore {
  constructor({ supabaseUrl, secretKey, fetchImpl = fetch }) {
    if (!supabaseUrl || !secretKey) throw new Error('SUPABASE_STORE_CONFIG_REQUIRED');
    this.restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
    this.secretKey = secretKey;
    this.fetch = fetchImpl;
  }

  async upsertProfile(profile) {
    const rows = await this.request(TABLES.profiles, {
      method: 'POST', query: { on_conflict: 'user_id' },
      prefer: 'resolution=merge-duplicates,return=representation', body: profileToRow(profile),
    });
    return profileFromRow(rows[0]);
  }

  async setRoles(userId, roles) {
    await this.request(TABLES.roles, {
      method: 'DELETE', query: { user_id: `eq.${userId}` }, prefer: 'return=minimal',
    });
    if (roles.length) {
      await this.request(TABLES.roles, {
        method: 'POST', prefer: 'return=minimal',
        body: roles.map((role) => ({ user_id: userId, role })),
      });
    }
    return [...roles];
  }

  async getUserSummary(userId) {
    const [profiles, roles, orders, entitlements, qr] = await Promise.all([
      this.request(TABLES.profiles, { query: { select: '*', user_id: `eq.${userId}`, limit: 1 } }),
      this.request(TABLES.roles, { query: { select: 'role', user_id: `eq.${userId}`, order: 'created_at.asc' } }),
      this.request(TABLES.orders, { query: { select: '*', user_id: `eq.${userId}`, order: 'created_at.desc' } }),
      this.request(TABLES.entitlements, { query: { select: '*', user_id: `eq.${userId}`, order: 'starts_at.desc' } }),
      this.request(TABLES.qr, { query: { select: publicQrColumns(), user_id: `eq.${userId}`, order: 'issued_at.desc' } }),
    ]);
    return {
      profile: profiles[0] ? profileFromRow(profiles[0]) : null,
      roles: roles.map((item) => item.role),
      orders: orders.map(orderFromRow),
      entitlements: entitlements.map(entitlementFromRow),
      qr: qr.map(qrFromRow),
    };
  }

  async createOrder(order) {
    const rows = await this.request(TABLES.orders, {
      method: 'POST', prefer: 'return=representation', body: orderToRow(order),
    });
    return orderFromRow(rows[0]);
  }

  async getOrder(id) {
    const rows = await this.request(TABLES.orders, { query: { select: '*', id: `eq.${id}`, limit: 1 } });
    return rows[0] ? orderFromRow(rows[0]) : null;
  }

  async saveOrder(order) {
    const rows = await this.request(TABLES.orders, {
      method: 'PATCH', query: { id: `eq.${order.id}` },
      prefer: 'return=representation', body: orderToRow(order),
    });
    if (!rows[0]) throw new Error('ORDER_NOT_FOUND');
    return orderFromRow(rows[0]);
  }

  async hasPaymentEvent(providerEventId) {
    const rows = await this.request(TABLES.paymentEvents, {
      query: {
        select: 'provider_event_id', provider: 'eq.mercadopago',
        provider_event_id: `eq.${providerEventId}`, limit: 1,
      },
    });
    return rows.length > 0;
  }

  async recordPaymentEvent(providerEventId, { orderId = null, payment = null } = {}) {
    const rows = await this.request(TABLES.paymentEvents, {
      method: 'POST', query: { on_conflict: 'provider,provider_event_id' },
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: {
        provider: 'mercadopago', provider_event_id: providerEventId, order_id: orderId,
        payment_id: payment?.id ? String(payment.id) : null,
        status: payment?.status ?? null, payload: payment ?? {},
      },
    });
    return rows.length > 0;
  }

  async releasePaymentEvent(providerEventId) {
    await this.request(TABLES.paymentEvents, {
      method: 'DELETE',
      query: { provider: 'eq.mercadopago', provider_event_id: `eq.${providerEventId}` },
      prefer: 'return=minimal',
    });
  }

  async grantEntitlement(entitlement) {
    const current = await this.getEntitlement(entitlement.orderId, entitlement.code);
    if (current) return current;
    try {
      const rows = await this.request(TABLES.entitlements, {
        method: 'POST', prefer: 'return=representation', body: entitlementToRow(entitlement),
      });
      return entitlementFromRow(rows[0]);
    } catch (error) {
      if (!/SUPABASE_STORE_(409|422)/.test(error.message)) throw error;
      const existing = await this.getEntitlement(entitlement.orderId, entitlement.code);
      if (!existing) throw error;
      return existing;
    }
  }

  async getEntitlement(orderId, code) {
    const rows = await this.request(TABLES.entitlements, {
      query: { select: '*', order_id: `eq.${orderId}`, code: `eq.${code}`, limit: 1 },
    });
    return rows[0] ? entitlementFromRow(rows[0]) : null;
  }

  async revokeOrderBenefits(orderId, now = new Date()) {
    const revokedAt = now.toISOString();
    await Promise.all([
      this.request(TABLES.entitlements, {
        method: 'PATCH', query: { order_id: `eq.${orderId}`, status: 'neq.revoked' },
        prefer: 'return=minimal', body: { status: 'revoked', revoked_at: revokedAt },
      }),
      this.request(TABLES.qr, {
        method: 'PATCH', query: { order_id: `eq.${orderId}`, status: 'eq.valid' },
        prefer: 'return=minimal', body: { status: 'revoked', revoked_at: revokedAt },
      }),
    ]);
  }

  async saveQr(credential) {
    const current = await this.getQrByOrder(credential.orderId);
    if (current) return current;
    try {
      const rows = await this.request(TABLES.qr, {
        method: 'POST', prefer: 'return=representation', body: qrToRow(credential),
      });
      return qrFromRow(rows[0]);
    } catch (error) {
      if (!/SUPABASE_STORE_(409|422)/.test(error.message)) throw error;
      const existing = await this.getQrByOrder(credential.orderId);
      if (!existing) throw error;
      return existing;
    }
  }

  async getQrByOrder(orderId) {
    const rows = await this.request(TABLES.qr, {
      query: { select: '*', order_id: `eq.${orderId}`, limit: 1 },
    });
    return rows[0] ? qrFromRow(rows[0]) : null;
  }

  async redeemQr(tokenHash, actorId, now = new Date()) {
    const rows = await this.request(TABLES.qr, {
      method: 'PATCH', query: { token_hash: `eq.${tokenHash}`, status: 'eq.valid' },
      prefer: 'return=representation',
      body: { status: 'used', used_at: now.toISOString(), used_by: actorId },
    });
    if (rows[0]) return { ok: true, credential: qrFromRow(rows[0]) };
    const existing = await this.request(TABLES.qr, {
      query: { select: '*', token_hash: `eq.${tokenHash}`, limit: 1 },
    });
    if (!existing[0]) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: existing[0].status };
  }

  async appendAudit(entry) {
    await this.request(TABLES.audit, {
      method: 'POST', prefer: 'return=minimal', body: auditToRow(entry),
    });
  }

  async isAdmin(userId) {
    const rows = await this.request(TABLES.admins, {
      query: { select: 'user_id', user_id: `eq.${userId}`, enabled: 'eq.true', limit: 1 },
    });
    return rows.length > 0;
  }

  async adminSnapshot() {
    const [profiles, orders, entitlements, qr, audit] = await Promise.all([
      this.request(TABLES.profiles, { query: { select: '*', order: 'created_at.desc' } }),
      this.request(TABLES.orders, { query: { select: '*', order: 'created_at.desc' } }),
      this.request(TABLES.entitlements, { query: { select: '*', order: 'starts_at.desc' } }),
      this.request(TABLES.qr, { query: { select: publicQrColumns(), order: 'issued_at.desc' } }),
      this.request(TABLES.audit, { query: { select: '*', order: 'created_at.desc', limit: 1000 } }),
    ]);
    return {
      profiles: profiles.map(profileFromRow), orders: orders.map(orderFromRow),
      entitlements: entitlements.map(entitlementFromRow), qr: qr.map(qrFromRow),
      audit: audit.map(auditFromRow),
    };
  }

  async saveSession(session) {
    await this.request(TABLES.sessions, {
      method: 'POST', prefer: 'return=minimal',
      body: {
        token_hash: session.tokenHash, user_id: session.userId, phone_e164: session.phone,
        created_at: session.createdAt, expires_at: session.expiresAt, revoked_at: session.revokedAt,
      },
    });
  }

  async getSession(tokenHash) {
    const rows = await this.request(TABLES.sessions, {
      query: { select: '*', token_hash: `eq.${tokenHash}`, limit: 1 },
    });
    if (!rows[0]) return null;
    return {
      tokenHash: rows[0].token_hash, userId: rows[0].user_id, phone: rows[0].phone_e164,
      createdAt: rows[0].created_at, expiresAt: rows[0].expires_at, revokedAt: rows[0].revoked_at,
    };
  }

  async revokeSession(tokenHash, now = new Date()) {
    await this.request(TABLES.sessions, {
      method: 'PATCH', query: { token_hash: `eq.${tokenHash}`, revoked_at: 'is.null' },
      prefer: 'return=minimal', body: { revoked_at: now.toISOString() },
    });
  }

  async request(table, { method = 'GET', query = {}, body, prefer } = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const url = `${this.restUrl}/${table}${params.size ? `?${params}` : ''}`;
    const response = await this.fetch(url, {
      method,
      headers: {
        apikey: this.secretKey, Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`SUPABASE_STORE_${response.status}${detail ? `:${detail.slice(0, 300)}` : ''}`);
    }
    if (response.status === 204) return [];
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  }
}

function profileToRow(item) {
  return {
    user_id: item.userId, phone_e164: item.phone, display_name: item.displayName,
    country_code: item.countryCode, accepted_general_terms_version: item.termsVersion,
    accepted_general_terms_at: item.termsAcceptedAt, updated_at: item.updatedAt,
  };
}

function profileFromRow(row) {
  return {
    userId: row.user_id, phone: row.phone_e164, displayName: row.display_name,
    countryCode: row.country_code, termsVersion: row.accepted_general_terms_version,
    termsAcceptedAt: row.accepted_general_terms_at, createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orderToRow(item) {
  return {
    id: item.id, user_id: item.userId, sku: item.sku, amount: item.amount,
    currency: item.currency, status: item.status, terms_version: item.termsVersion,
    terms_accepted_at: item.termsAcceptedAt, payer: item.payer ?? {},
    metadata: item.metadata ?? {}, provider: item.provider,
    provider_preference_id: item.providerPreferenceId ?? null,
    provider_payment_id: item.providerPaymentId ?? null,
    created_at: item.createdAt, updated_at: item.updatedAt,
  };
}

function orderFromRow(row) {
  return {
    id: row.id, userId: row.user_id, sku: row.sku, amount: Number(row.amount),
    currency: row.currency, status: row.status, termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at, payer: row.payer ?? {}, metadata: row.metadata ?? {},
    provider: row.provider, providerPreferenceId: row.provider_preference_id,
    providerPaymentId: row.provider_payment_id, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function entitlementToRow(item) {
  return {
    id: item.id, order_id: item.orderId, user_id: item.userId, code: item.code,
    status: item.status, starts_at: item.startsAt, expires_at: item.expiresAt,
    revoked_at: item.revokedAt ?? null,
  };
}

function entitlementFromRow(row) {
  return {
    id: row.id, orderId: row.order_id, userId: row.user_id, code: row.code,
    status: row.status, startsAt: row.starts_at, expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

function qrToRow(item) {
  return {
    id: item.id, order_id: item.orderId, user_id: item.userId, kind: item.kind,
    token_hash: item.tokenHash, token_ciphertext: item.tokenCiphertext, status: item.status,
    issued_at: item.issuedAt, used_at: item.usedAt, used_by: item.usedBy ?? null,
    revoked_at: item.revokedAt,
  };
}

function qrFromRow(row) {
  return {
    id: row.id, orderId: row.order_id, userId: row.user_id, kind: row.kind,
    tokenHash: row.token_hash, tokenCiphertext: row.token_ciphertext, status: row.status,
    issuedAt: row.issued_at, usedAt: row.used_at, usedBy: row.used_by,
    revokedAt: row.revoked_at,
  };
}

function auditToRow(item) {
  return {
    id: item.id, actor_id: item.actorId, action: item.action,
    target_type: item.targetType ?? null, target_id: item.target ?? item.targetId ?? null,
    result: item.result, metadata: item.metadata ?? {}, created_at: item.createdAt,
  };
}

function auditFromRow(row) {
  return {
    id: row.id, actorId: row.actor_id, action: row.action, targetType: row.target_type,
    target: row.target_id, result: row.result, metadata: row.metadata ?? {}, createdAt: row.created_at,
  };
}

function publicQrColumns() {
  return 'id,order_id,user_id,kind,status,issued_at,used_at,used_by,revoked_at';
}
