import { buildMetricSnapshot, buildInvestorSnapshot, groupMetricsBySection } from './aggregation-engine.mjs';
import { buildMetricComparison, buildDailySeries } from './trend-engine.mjs';
import { buildUnifiedFunnel, buildGlobalFunnel } from './funnel-engine.mjs';
import { requirePermission } from './access-control.mjs';
import { MetricVisibility } from './metric-catalog.mjs';

export function createControlService({store}={}){
  if (!store) throw new Error('store es obligatorio');
  return {
    adminOverview({role='ADMIN',range={}}={}){
      requirePermission(role,'CONTROL_READ');
      const snapshot=buildMetricSnapshot({facts:store.listFacts(),range});
      return {view:'ADMIN',catalog_version:snapshot.catalog_version,generated_at:snapshot.generated_at,range:snapshot.range,sections:groupMetricsBySection(snapshot),module_health:store.listModuleHealth()};
    },
    investorSnapshot({role='INVESTOR',range={}}={}){
      requirePermission(role,'INVESTOR_VIEW');
      const snapshot=buildInvestorSnapshot({facts:store.listFacts(),range});
      return {...snapshot,sections:groupMetricsBySection(snapshot)};
    },
    trends({role='ADMIN',period='DAY',now=new Date(),days=30,investor=false}={}){
      requirePermission(role,investor?'INVESTOR_VIEW':'CONTROL_READ');
      const visibility=investor ? MetricVisibility.INVESTOR : null;
      const facts=store.listFacts();
      return {view:investor?'INVESTOR':'ADMIN',comparison:buildMetricComparison({facts,period,now,visibility}),daily_series:buildDailySeries({facts,days,now,visibility}),privacy:investor?'AGGREGATED_ONLY':undefined};
    },
    funnel({role='ADMIN',range={},groupBy='source'}={}){
      requirePermission(role,'CONTROL_READ');
      const facts=store.listFacts();
      return {view:'ADMIN',range,global:buildGlobalFunnel({facts,range}),groups:buildUnifiedFunnel({facts,range,groupBy}),group_by:groupBy};
    },
    recordFact({role='ADMIN',fact}={}){requirePermission(role,'CONTROL_WRITE');return store.addFact(fact);},
    updateModuleHealth({role='ADMIN',health}={}){requirePermission(role,'CONTROL_WRITE');return store.upsertModuleHealth(health);}
  };
}
