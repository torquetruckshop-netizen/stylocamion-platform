import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInvestorExport,verifyInvestorExport} from '../src/investor-export.mjs';

test('export Investor queda agregado y verificable',()=>{
 const snapshot={view:'INVESTOR',generated_at:'2026-08-16T12:00:00Z',catalog_version:'v1',range:{start:null,end:null},sections:{CARGAS:{loads_detected:{value:10}}}};
 const doc=buildInvestorExport({snapshot});
 assert.equal(doc.privacy,'AGGREGATED_ONLY');
 assert.equal(verifyInvestorExport(doc),true);
 const tampered={...doc,sections:{CARGAS:{loads_detected:{value:999}}}};
 assert.equal(verifyInvestorExport(tampered),false);
});
