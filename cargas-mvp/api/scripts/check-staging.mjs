import { stagingReadiness } from '../src/staging-config.mjs';

const r=stagingReadiness(process.env);
console.log(JSON.stringify(r,null,2));
if (!r.ready) process.exitCode=1;
