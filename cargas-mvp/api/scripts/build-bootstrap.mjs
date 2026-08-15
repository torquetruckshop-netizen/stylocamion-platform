import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const dbDir=path.resolve(here,'../../db');
const files=[
  '001_initial_schema.sql',
  '002_channels.sql',
  '002_commercial_and_conversations.sql',
  '003_private_network.sql',
  '004_notifications.sql',
  '005_users_registration.sql',
  '006_user_identities.sql',
  '007_persistent_user_sessions.sql'
];
const output=path.join(dbDir,'bootstrap-staging.generated.sql');
const sql=files.map(name=>`-- ===== ${name} =====\n${fs.readFileSync(path.join(dbDir,name),'utf8').trim()}\n`).join('\n');
fs.writeFileSync(output,sql+'\n','utf8');
console.log(output);
