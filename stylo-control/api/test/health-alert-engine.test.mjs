import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHealthAlerts,resolveRecoveredAlerts} from '../src/health-alert-engine.mjs';

test('crea una sola alerta por incidente activo',()=>{
 const health=[{module:'CARGAS',status:'DOWN',detail:'sin eventos'}];
 const first=buildHealthAlerts({health});
 assert.equal(first.length,1);
 const second=buildHealthAlerts({health,previousAlerts:first});
 assert.equal(second.length,0);
});

test('resuelve alerta cuando módulo vuelve a healthy',()=>{
 const alerts=[{key:'VENTAS:DEGRADED',module:'VENTAS',status:'OPEN'}];
 const resolved=resolveRecoveredAlerts({health:[{module:'VENTAS',status:'HEALTHY'}],alerts});
 assert.equal(resolved[0].status,'RESOLVED');
});
