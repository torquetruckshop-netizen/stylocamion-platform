import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretControlQuestion,answerControlQuestion} from '../src/conversational-analytics-engine.mjs';

test('interpreta consulta natural de pagos de la semana',()=>{
 const p=interpretControlQuestion('¿Cuántos pagos tuvimos esta semana?');
 assert.equal(p.metric_key,'payments_confirmed');
 assert.equal(p.period,'WEEK');
});

test('responde con métricas verificadas y rango temporal',()=>{
 const facts=[
  {module:'REVENUE',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:'P1',occurred_at:'2026-08-15T10:00:00Z'},
  {module:'REVENUE',event_type:'PAYMENT_CONFIRMED',entity_type:'PAYMENT',entity_id:'P2',occurred_at:'2026-08-16T10:00:00Z'}
 ];
 const r=answerControlQuestion({question:'pagos esta semana',facts,now:new Date('2026-08-16T12:00:00Z')});
 assert.equal(r.status,'ANSWERED');
 assert.equal(r.metric_key,'payments_confirmed');
 assert.equal(r.value,2);
});

test('no inventa respuesta si no reconoce la métrica',()=>{
 const r=answerControlQuestion({question:'¿qué color conviene hoy?',facts:[]});
 assert.equal(r.status,'NEEDS_CLARIFICATION');
});
