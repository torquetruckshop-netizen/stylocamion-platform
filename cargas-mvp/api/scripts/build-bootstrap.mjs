import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dbDir=path.resolve(here,'../../db');
export const BOOTSTRAP_MIGRATIONS=[
  '001_initial_schema.sql',
  '002_channels.sql',
  '002_commercial_and_conversations.sql',
  '003_private_network.sql',
  '004_notifications.sql',
  '005_users_registration.sql',
  '006_user_identities.sql',
  '007_persistent_user_sessions.sql',
  '008_resilient_digital_intake.sql',
  '009_location_resolution.sql',
  '010_trip_economics.sql',
  '011_telematics_integrations.sql',
  '012_vehicle_efficiency_profiles.sql',
  '013_marketplace_intelligence.sql'
];
const output=path.join(dbDir,'bootstrap-staging.generated.sql');

export function buildBootstrapSql({dbDirectory=dbDir,files=BOOTSTRAP_MIGRATIONS}={}) {
  return files.map(name=>`-- ===== ${name} =====\n${fs.readFileSync(path.join(dbDirectory,name),'utf8').trim()}\n`).join('\n')+'\n';
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const sql=buildBootstrapSql();
  fs.writeFileSync(output,sql,'utf8');
  console.log(output);
}
