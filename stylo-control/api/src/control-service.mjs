import { buildMetricSnapshot, buildInvestorSnapshot, groupMetricsBySection } from './aggregation-engine.mjs';
import { buildMetricComparison, buildDailySeries } from './trend-engine.mjs';
import { buildUnifiedFunnel, buildGlobalFunnel } from './funnel-engine.mjs';
import { buildAttributionReport } from './attribution-engine.mjs';
import { buildHealthAlerts } from './health-alert-engine.mjs';
import { buildInvestorExport } from './investor-export.mjs';
import { answerControlQuestion } from './conversational-analytics-engine.mjs';
import { detectMetricAnomalies } from './anomaly-detection-engine.mjs';
import { buildRetentionCohorts } from './cohort-engine.mjs';
import { buildUnitEconomics } from './unit-economics-engine.mjs';
import { buildNetworkLiquidity } from './network-liquidity-engine.mjs';
import { buildExecutiveBrief } from './executive-brief-engine.mjs';
import { buildModuleQualityScores } from './module-quality-engine.mjs';
import { buildWorldClassKpis } from './world-class-kpi-engine.mjs';
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
    investorExport({role='INVESTOR',range={},expiresAt=null}={}){
      requirePermission(role,'INVESTOR_VIEW');
      const snapshot=buildInvestorSnapshot({facts:store.listFacts(),range});
      return buildInvestorExport({snapshot:{...snapshot,sections:groupMetricsBySection(snapshot)},expiresAt});
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
    attribution({role='ADMIN',range={},groupBy='source'}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',range,group_by:groupBy,rows:buildAttributionReport({facts:store.listFacts(),range,groupBy})};
    },
    healthAlerts({role='ADMIN'}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',alerts:buildHealthAlerts({health:store.listModuleHealth()})};
    },
    ask({role='ADMIN',question,now=new Date()}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',question,answer:answerControlQuestion({question,facts:store.listFacts(),now})};
    },
    anomalies({role='ADMIN',period='DAY',now=new Date()}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',...detectMetricAnomalies({facts:store.listFacts(),period,now})};
    },
    cohorts({role='ADMIN',cohort='MONTH',periods=6}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',cohort,rows:buildRetentionCohorts({facts:store.listFacts(),cohort,periods})};
    },
    unitEconomics({role='ADMIN',range={},groupBy='module'}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',range,group_by:groupBy,rows:buildUnitEconomics({facts:store.listFacts(),range,groupBy})};
    },
    networkLiquidity({role='ADMIN',range={}}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',range,...buildNetworkLiquidity({facts:store.listFacts(),range})};
    },
    moduleQuality({role='ADMIN',now=new Date()}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',generated_at:new Date(now).toISOString(),rows:buildModuleQualityScores({health:store.listModuleHealth(),facts:store.listFacts(),now})};
    },
    executiveBrief({role='ADMIN',period='DAY',now=new Date()}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',...buildExecutiveBrief({facts:store.listFacts(),health:store.listModuleHealth(),period,now})};
    },
    worldClassKpis({role='ADMIN',range={}}={}){
      requirePermission(role,'CONTROL_READ');
      return {view:'ADMIN',range,sections:buildWorldClassKpis({facts:store.listFacts(),range})};
    },
    recordFact({role='ADMIN',fact}={}){requirePermission(role,'CONTROL_WRITE');return store.addFact(fact);},
    updateModuleHealth({role='ADMIN',health}={}){requirePermission(role,'CONTROL_WRITE');return store.upsertModuleHealth(health);}
  };
}
