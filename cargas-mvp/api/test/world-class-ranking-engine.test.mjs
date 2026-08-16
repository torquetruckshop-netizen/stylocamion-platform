import test from 'node:test';
import assert from 'node:assert/strict';
import {rankEligibleCandidatesWorldClass} from '../src/world-class-ranking-engine.mjs';

test('señales de preferencia y aceptación desempatan candidatos similares',async()=>{
 const candidates=[
  {vehicle:{id:'A'},carrier:{id:'CA'},match:{total_score:90}},
  {vehicle:{id:'B'},carrier:{id:'CB'},match:{total_score:91}}
 ];
 const ranked=await rankEligibleCandidatesWorldClass({load:{id:'L'},candidates,candidateIntelligenceResolver:async({vehicle})=>vehicle.id==='A'?{preference_score:95,acceptance_probability:90,trust_score:90,facility_risk:'GREEN',auto_transact_allowed:true}:{preference_score:40,acceptance_probability:40,trust_score:70,facility_risk:'YELLOW',auto_transact_allowed:true}});
 assert.equal(ranked[0].vehicle.id,'A');
});

test('trust gate bloquea automatización aunque score sea alto',async()=>{
 const candidates=[{vehicle:{id:'A'},match:{total_score:99}},{vehicle:{id:'B'},match:{total_score:88}}];
 const ranked=await rankEligibleCandidatesWorldClass({load:{},candidates,candidateIntelligenceResolver:async({vehicle})=>vehicle.id==='A'?{preference_score:100,acceptance_probability:100,trust_score:20,auto_transact_allowed:false}:{preference_score:70,acceptance_probability:70,trust_score:80,auto_transact_allowed:true}});
 assert.equal(ranked[0].vehicle.id,'B');
 assert.equal(ranked.find(x=>x.vehicle.id==='A').world_class_eligible,false);
});
