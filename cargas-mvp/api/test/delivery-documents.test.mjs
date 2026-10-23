import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOperationDocuments,documentRequirementsForOperation} from '../src/document-compliance-engine.mjs';
import {buildProofOfDelivery,verifyProofOfDelivery,buildDeliveryEvidence} from '../src/proof-of-delivery-engine.mjs';

test('compliance bloquea documentos obligatorios faltantes',()=>{const req=documentRequirementsForOperation({country:'AR'}).requirements;const r=evaluateOperationDocuments({requirements:req,documents:[]});assert.equal(r.status,'BLOCKED');assert.equal(r.can_load,false);assert.ok(r.missing_types.includes('INSURANCE'));});

test('compliance habilita si documentos requeridos están válidos y verificados',()=>{const req=documentRequirementsForOperation({country:'AR'}).requirements;const docs=req.map((x,i)=>({id:`D${i}`,type:x.type,status:'VALID',verified:true,expires_at:'2027-12-31T00:00:00Z'}));const r=evaluateOperationDocuments({requirements:req,documents:docs,now:new Date('2026-08-16T00:00:00Z')});assert.equal(r.status,'CLEAR');assert.equal(r.can_load,true);});

test('POD con evidencia conserva checksum verificable',()=>{const evidence=buildDeliveryEvidence({type:'PHOTO',reference:'file-ref-1',observedAt:'2026-08-16T12:00:00Z'});const pod=buildProofOfDelivery({loadId:'L1',vehicleId:'V1',deliveredAt:'2026-08-16T12:00:00Z',evidence:[evidence],location:{lat:-31.7,lon:-60.5}});const v=verifyProofOfDelivery(pod);assert.equal(v.valid,true);assert.equal(v.checksum_match,true);assert.equal(pod.legal_status,'OPERATIONAL_EVIDENCE_ONLY');});

test('POD alterado falla verificación',()=>{const pod=buildProofOfDelivery({loadId:'L1',evidence:[{type:'DOCUMENT',reference:'x'}]});const changed={...pod,notes:'alterado'};assert.equal(verifyProofOfDelivery(changed).valid,false);});
