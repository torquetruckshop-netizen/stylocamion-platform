import { createClient } from '@supabase/supabase-js';

function required(value, name) {
  if (!value) throw Object.assign(new Error(`${name} no configurado`), { status: 503 });
  return value;
}

export function createSupabaseAdminClient(env = process.env) {
  const url = required(env.SUPABASE_URL, 'SUPABASE_URL');
  const key = required(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SECRET_KEY');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

export function mapLoadToRow(load) {
  return {
    public_id: load.id,
    intake_message_id: load.intake_message_id || null,
    source: load.source,
    sender_id: load.sender_id,
    raw_text: load.raw_text,
    origin_name: load.origin,
    destination_name: load.destination,
    cargo_type: load.cargo_type,
    weight_tn: load.weight_tn,
    equipment_required: load.equipment_required,
    pickup_at: load.pickup_at,
    status: load.status,
    traffic_light: load.traffic_light,
    missing_fields: load.missing_fields || [],
    operation_channel_id: load.operation_channel_id || null,
    assigned_vehicle_id: load.assigned_vehicle_id || null,
    assigned_carrier_id: load.assigned_carrier_id || null,
    created_at: load.created_at,
    updated_at: new Date().toISOString()
  };
}

export function mapLoadRow(row) {
  return {
    id: row.public_id,
    db_id: row.id,
    intake_message_id: row.intake_message_id || null,
    source: row.source,
    sender_id: row.sender_id,
    raw_text: row.raw_text,
    origin: row.origin_name,
    destination: row.destination_name,
    cargo_type: row.cargo_type,
    weight_tn: row.weight_tn == null ? null : Number(row.weight_tn),
    equipment_required: row.equipment_required,
    pickup_at: row.pickup_at,
    status: row.status,
    traffic_light: row.traffic_light,
    missing_fields: row.missing_fields || [],
    operation_channel_id: row.operation_channel_id || null,
    assigned_vehicle_id: row.assigned_vehicle_id,
    assigned_carrier_id: row.assigned_carrier_id,
    created_at: row.created_at
  };
}

export function mapIntakeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    external_message_id: row.external_message_id || null,
    sender_id: row.sender_id || null,
    raw_text: row.raw_text ?? null,
    content_type: row.content_type || 'TEXT',
    media_reference: row.media_reference || null,
    operation_channel_id: row.operation_channel_id || null,
    received_at: row.received_at,
    metadata: row.metadata || {},
    classification: row.classification || null,
    processing_status: row.processing_status || 'RECEIVED',
    processing_error: row.processing_error || null,
    processed_at: row.processed_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function mapVehicleRow(row) {
  return {
    id: row.id,
    carrier_id: row.carrier_id,
    plate: row.plate,
    equipment_type: row.equipment_type,
    capacity_tn: row.capacity_tn == null ? null : Number(row.capacity_tn),
    availability: row.availability,
    location: row.lat == null || row.lon == null ? null : { lat: Number(row.lat), lon: Number(row.lon) },
    location_source: row.location_source,
    location_updated_at: row.location_updated_at,
    document_state: row.document_state
  };
}

export class SupabaseStore {
  constructor(client = createSupabaseAdminClient()) { this.db = client; }

  async addUser(user) {
    const row = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      company: user.company,
      country: user.country,
      role: user.role,
      email: user.email,
      email_verified: Boolean(user.email_verified),
      avatar_url: user.avatar_url,
      access_status: user.access_status,
      review_status: user.review_status,
      registered_at: user.registered_at,
      updated_at: user.updated_at,
      reviewed_at: user.reviewed_at,
      reviewed_by: user.reviewed_by,
      review_note: user.review_note
    };
    const { data, error } = await this.db.from('app_users').insert(row).select().single();
    if (error) throw error;
    return data;
  }

  async getUser(id) {
    const { data, error } = await this.db.from('app_users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async getUserByPhone(phone) {
    const { data, error } = await this.db.from('app_users').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return data;
  }

  async getUserByGoogleSub(subject) {
    const { data: identity, error } = await this.db.from('user_identities').select('user_id').eq('provider','GOOGLE').eq('provider_subject',subject).maybeSingle();
    if (error) throw error;
    return identity ? this.getUser(identity.user_id) : null;
  }

  async linkGoogleIdentity(userId, profile) {
    const payload = {
      user_id: userId,
      provider: 'GOOGLE',
      provider_subject: profile.subject,
      email: profile.email,
      email_verified: Boolean(profile.email_verified),
      profile,
      last_login_at: new Date().toISOString()
    };
    const { error } = await this.db.from('user_identities').upsert(payload, { onConflict: 'provider,provider_subject' });
    if (error) throw error;
    const patch = { email: profile.email, email_verified: Boolean(profile.email_verified), avatar_url: profile.picture, updated_at: new Date().toISOString() };
    if (profile.name) patch.name = profile.name;
    return this.updateUser(userId, patch);
  }

  async updateUser(id, patch) {
    const { data, error } = await this.db.from('app_users').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async listUsers(filters = {}) {
    let q = this.db.from('app_users').select('*').order('registered_at', { ascending: false });
    if (filters.review_status) q = q.eq('review_status', filters.review_status);
    if (filters.access_status) q = q.eq('access_status', filters.access_status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async addSession(session) {
    const { data, error } = await this.db.from('user_sessions').insert(session).select().single();
    if (error) throw error;
    return data;
  }

  async getSessionByTokenHash(tokenHash) {
    const { data, error } = await this.db.from('user_sessions').select('*').eq('token_hash', tokenHash).maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateSession(id, patch) {
    const { data, error } = await this.db.from('user_sessions').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async listUserSessions(userId) {
    const { data, error } = await this.db.from('user_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addIntakeMessage(message) {
    const row = {
      source: message.source,
      external_message_id: message.external_message_id || null,
      sender_id: message.sender_id || null,
      raw_text: message.raw_text ?? null,
      content_type: message.content_type || 'TEXT',
      media_reference: message.media_reference || null,
      operation_channel_id: message.operation_channel_id || null,
      received_at: message.received_at || new Date().toISOString(),
      metadata: message.metadata || {},
      classification: message.classification || null,
      processing_status: message.processing_status || 'RECEIVED',
      processing_error: message.processing_error || null,
      processed_at: message.processed_at || null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.db.from('intake_messages').insert(row).select().single();
    if (error?.code === '23505' && row.external_message_id) {
      return this.getIntakeByExternalMessage(row.source, row.external_message_id);
    }
    if (error) throw error;
    return mapIntakeRow(data);
  }

  async getIntakeMessage(id) {
    const { data, error } = await this.db.from('intake_messages').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return mapIntakeRow(data);
  }

  async getIntakeByExternalMessage(source, externalMessageId) {
    if (!externalMessageId) return null;
    const { data, error } = await this.db.from('intake_messages').select('*').eq('source', source).eq('external_message_id', externalMessageId).maybeSingle();
    if (error) throw error;
    return mapIntakeRow(data);
  }

  async updateIntakeMessage(id, patch) {
    const allowed = ['raw_text','classification','processing_status','processing_error','processed_at','media_reference','metadata'];
    const dbPatch = { updated_at: new Date().toISOString() };
    for (const key of allowed) if (key in patch) dbPatch[key] = patch[key];
    const { data, error } = await this.db.from('intake_messages').update(dbPatch).eq('id', id).select().single();
    if (error) throw error;
    return mapIntakeRow(data);
  }

  async claimIntakeMessage(id, expectedStatuses = ['RECEIVED','AWAITING_TRANSCRIPTION','FAILED']) {
    const { data, error } = await this.db.from('intake_messages')
      .update({ processing_status:'PROCESSING', processing_error:null, updated_at:new Date().toISOString() })
      .eq('id', id)
      .in('processing_status', expectedStatuses)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return mapIntakeRow(data);
  }

  async listIntakeMessages(filters = {}) {
    let q = this.db.from('intake_messages').select('*').order('received_at', { ascending: true });
    if (filters.processing_status) q = q.eq('processing_status', filters.processing_status);
    if (filters.source) q = q.eq('source', filters.source);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapIntakeRow);
  }

  async addLoad(load) {
    const { data, error } = await this.db.from('loads').insert(mapLoadToRow(load)).select().single();
    if (error) throw error;
    return mapLoadRow(data);
  }

  async getLoad(publicId) {
    const { data, error } = await this.db.from('loads').select('*').eq('public_id', publicId).maybeSingle();
    if (error) throw error;
    return data ? mapLoadRow(data) : null;
  }

  async getLoadByIntakeMessageId(intakeMessageId) {
    if (!intakeMessageId) return null;
    const { data, error } = await this.db.from('loads').select('*').eq('intake_message_id', intakeMessageId).maybeSingle();
    if (error) throw error;
    return data ? mapLoadRow(data) : null;
  }

  async updateLoad(publicId, patch) {
    const dbPatch = { updated_at: new Date().toISOString() };
    if ('status' in patch) dbPatch.status = patch.status;
    if ('traffic_light' in patch) dbPatch.traffic_light = patch.traffic_light;
    if ('assigned_vehicle_id' in patch) dbPatch.assigned_vehicle_id = patch.assigned_vehicle_id;
    if ('assigned_carrier_id' in patch) dbPatch.assigned_carrier_id = patch.assigned_carrier_id;
    const { data, error } = await this.db.from('loads').update(dbPatch).eq('public_id', publicId).select().single();
    if (error) throw error;
    return mapLoadRow(data);
  }

  async listAvailableVehicles() {
    const { data, error } = await this.db.from('vehicles').select('*, carriers(*)').eq('availability','AVAILABLE');
    if (error) throw error;
    return (data || []).map(row => ({ vehicle: mapVehicleRow(row), carrier: row.carriers }));
  }

  async saveMatches(load, matches) {
    const rows = matches.map(m => ({ ...m, load_id: load.db_id }));
    if (!rows.length) return [];
    const { data, error } = await this.db.from('load_matches').upsert(rows, { onConflict: 'load_id,vehicle_id' }).select();
    if (error) throw error;
    return data || [];
  }

  async addEvent(event) {
    if (event.load_id) {
      const load = await this.getLoad(event.load_id);
      if (!load) return null;
      const { data, error } = await this.db.from('load_events').insert({ load_id: load.db_id, type: event.type, actor: event.actor, payload: event.payload || {}, created_at: event.created_at }).select().single();
      if (error) throw error;
      return data;
    }
    if (event.user_id) {
      const { data, error } = await this.db.from('user_admin_events').insert({ user_id: event.user_id, event_type: event.type, actor: event.actor, payload: event.payload || {}, created_at: event.created_at }).select().single();
      if (error) throw error;
      return data;
    }
    return null;
  }
}
