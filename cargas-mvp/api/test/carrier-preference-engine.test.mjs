import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCarrierPreferenceProfile,scoreLoadPreference} from '../src/carrier-preference-engine.mjs';

test('aprende carriles y equipo preferidos desde comportamiento',()=>{
 const events=[];
 for(let i=0;i<12;i++) events.push({action:'ACCEPT',origin:'Rosario',destination:'Parana',equipment_type:'sider',cargo_type:'general'});
 for(let i=0;i<3;i++) events.push({action:'REJECT',origin:'Cordoba',destination:'Mendoza',equipment_type:'batea',cargo_type:'mineral'});
 const p=buildCarrierPreferenceProfile(events);
 assert.equal(p.confidence,'MEDIUM');
 assert.equal(p.preferred_lanes[0].key,'rosario>parana');
 const preferred=scoreLoadPreference({origin:'Rosario',destination:'Parana',equipment_required:'sider',cargo_type:'general'},p);
 const other=scoreLoadPreference({origin:'Cordoba',destination:'Mendoza',equipment_required:'batea',cargo_type:'mineral'},p);
 assert.ok(preferred.preference_score>other.preference_score);
});
