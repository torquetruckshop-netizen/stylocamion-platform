export class SupabaseControlStore {
  constructor({client}={}){if(!client)throw new Error('client obligatorio');this.client=client;}
  async addFact(fact){
    const row=cleanFact(fact);
    const {data,error}=await this.client.from('control_facts').upsert(row,{onConflict:'module,source_event_id',ignoreDuplicates:true}).select().maybeSingle();
    if(error) throw error;
    if(data) return data;
    if(row.source_event_id){const {data:existing,error:readError}=await this.client.from('control_facts').select('*').eq('module',row.module).eq('source_event_id',row.source_event_id).maybeSingle();if(readError)throw readError;return existing;}
    return row;
  }
  async getFactBySourceEvent(module,sourceEventId){const {data,error}=await this.client.from('control_facts').select('*').eq('module',String(module).toUpperCase()).eq('source_event_id',sourceEventId).maybeSingle();if(error)throw error;return data||null;}
  async listFacts({start=null,end=null}={}){let q=this.client.from('control_facts').select('*').order('occurred_at',{ascending:true});if(start)q=q.gte('occurred_at',start);if(end)q=q.lte('occurred_at',end);const {data,error}=await q;if(error)throw error;return data||[];}
  async upsertModuleHealth(item){const row={...item,module:String(item.module).toUpperCase(),checked_at:item.checked_at||new Date().toISOString(),updated_at:new Date().toISOString()};const {data,error}=await this.client.from('control_module_health').upsert(row,{onConflict:'module'}).select().single();if(error)throw error;return data;}
  async listModuleHealth(){const {data,error}=await this.client.from('control_module_health').select('*').order('module',{ascending:true});if(error)throw error;return data||[];}
  async saveSnapshot({view_type,catalog_version,range,metrics,generated_at}){const {data,error}=await this.client.from('control_metric_snapshots').insert({view_type,catalog_version,range_start:range?.start||null,range_end:range?.end||null,metrics,generated_at:generated_at||new Date().toISOString()}).select().single();if(error)throw error;return data;}
}

function cleanFact(f={}){return{module:String(f.module||'PLATFORM').toUpperCase(),source_event_id:f.source_event_id||null,event_type:String(f.event_type||'').toUpperCase(),entity_type:f.entity_type||null,entity_id:f.entity_id||null,value:f.value??null,currency:f.currency||null,status:f.status||null,channel:f.channel||null,country:f.country||null,dimensions:f.dimensions||{},occurred_at:f.occurred_at||new Date().toISOString()};}
