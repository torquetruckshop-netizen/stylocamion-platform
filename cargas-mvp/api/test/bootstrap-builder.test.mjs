import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOTSTRAP_MIGRATIONS, buildBootstrapSql } from '../scripts/build-bootstrap.mjs';

test('bootstrap incluye todas las migraciones operativas actuales en orden', () => {
  assert.deepEqual(BOOTSTRAP_MIGRATIONS, [
    '001_initial_schema.sql','002_channels.sql','002_commercial_and_conversations.sql','003_private_network.sql','004_notifications.sql','005_users_registration.sql','006_user_identities.sql','007_persistent_user_sessions.sql','008_resilient_digital_intake.sql','009_location_resolution.sql','010_trip_economics.sql','011_telematics_integrations.sql','012_vehicle_efficiency_profiles.sql','013_marketplace_intelligence.sql','014_operational_intelligence.sql','015_delivery_documents.sql','016_telematics_intelligence.sql'
  ]);
});

test('bootstrap instala las capas de inteligencia en secuencia', () => {
  const sql=buildBootstrapSql();
  const names=['010_trip_economics.sql','011_telematics_integrations.sql','012_vehicle_efficiency_profiles.sql','013_marketplace_intelligence.sql','014_operational_intelligence.sql','015_delivery_documents.sql','016_telematics_intelligence.sql'];
  const positions=names.map(name=>sql.indexOf(`-- ===== ${name} =====`));
  assert.ok(positions.every((x,i)=>x>=0&&(i===0||x>positions[i-1])));
  assert.match(sql,/estimated_snapshot_id uuid references trip_economic_estimates\(id\)/);
  assert.doesNotMatch(sql,/references travel_cost_estimates\(id\)/);
});
