import { buildMetricSnapshot, buildInvestorSnapshot, groupMetricsBySection } from './aggregation-engine.mjs';
import { requirePermission } from './access-control.mjs';

export function createControlService({store}={}){
  if (!store) throw new Error('store es obligatorio');

  return {
    adminOverview({role='ADMIN',range={}}={}){
      requirePermission(role,'CONTROL_READ');
      const snapshot=buildMetricSnapshot({facts:store.listFacts(),range});
      return {
        view:'ADMIN',
        catalog_version:snapshot.catalog_version,
        generated_at:snapshot.generated_at,
        range:snapshot.range,
        sections:groupMetricsBySection(snapshot),
        module_health:store.listModuleHealth()
      };
    },

    investorSnapshot({role='INVESTOR',range={}}={}){
      requirePermission(role,'INVESTOR_VIEW');
      const snapshot=buildInvestorSnapshot({facts:store.listFacts(),range});
      return {
        ...snapshot,
        sections:groupMetricsBySection(snapshot)
      };
    },

    recordFact({role='ADMIN',fact}={}){
      requirePermission(role,'CONTROL_WRITE');
      return store.addFact(fact);
    },

    updateModuleHealth({role='ADMIN',health}={}){
      requirePermission(role,'CONTROL_WRITE');
      return store.upsertModuleHealth(health);
    }
  };
}
