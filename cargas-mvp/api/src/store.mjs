export class MemoryStore {
  constructor(seed={}) {
    this.loads = new Map((seed.loads || []).map(x => [x.id, x]));
    this.carriers = new Map((seed.carriers || []).map(x => [x.id, x]));
    this.vehicles = new Map((seed.vehicles || []).map(x => [x.id, x]));
    this.users = new Map((seed.users || []).map(x => [x.id, x]));
    this.events = [];
    this.matches = [];
  }
  addLoad(load){ this.loads.set(load.id, load); return load; }
  listLoads(filters={}){ return [...this.loads.values()].filter(x => (!filters.status || x.status===filters.status) && (!filters.traffic_light || x.traffic_light===filters.traffic_light)); }
  getLoad(id){ return this.loads.get(id); }
  updateLoad(id, patch){ const x={...this.loads.get(id),...patch}; this.loads.set(id,x); return x; }
  listVehicles(){ return [...this.vehicles.values()]; }
  getVehicle(id){ return this.vehicles.get(id); }
  updateVehicle(id, patch){ const x={...this.vehicles.get(id),...patch}; this.vehicles.set(id,x); return x; }
  getCarrier(id){ return this.carriers.get(id); }
  addUser(user){ this.users.set(user.id,user); return user; }
  getUser(id){ return this.users.get(id); }
  getUserByPhone(phone){ return [...this.users.values()].find(x=>x.phone===phone) || null; }
  updateUser(id, patch){ const current=this.users.get(id); if (!current) return null; const x={...current,...patch}; this.users.set(id,x); return x; }
  listUsers(filters={}){ return [...this.users.values()].filter(x => (!filters.review_status || x.review_status===filters.review_status) && (!filters.access_status || x.access_status===filters.access_status)); }
  saveMatches(loadId, matches){ this.matches=this.matches.filter(m=>m.load_id!==loadId).concat(matches); return matches; }
  getMatches(loadId){ return this.matches.filter(m=>m.load_id===loadId).sort((a,b)=>b.total_score-a.total_score); }
  addEvent(event){ this.events.push(event); return event; }
  listExceptions(){ return this.listLoads({traffic_light:'RED'}); }
}

export const seed = {
  users:[],
  carriers:[
    {id:'CAR-1',name:'Transporte López',status:'ACTIVE',reputation_score:4.8,completed_operations:27},
    {id:'CAR-2',name:'Logística del Litoral',status:'ACTIVE',reputation_score:4.5,completed_operations:19},
    {id:'CAR-3',name:'Transporte Norte',status:'ACTIVE',reputation_score:4.2,completed_operations:11}
  ],
  vehicles:[
    {id:'VEH-34',carrier_id:'CAR-1',plate:'AB123CD',equipment_type:'chasis + acoplado',capacity_tn:30,availability:'AVAILABLE',location:{lat:-31.20,lon:-61.50},location_source:'TELEMATICS',location_updated_at:new Date().toISOString(),document_state:'GREEN'},
    {id:'VEH-12',carrier_id:'CAR-2',plate:'AC456EF',equipment_type:'chasis + acoplado',capacity_tn:30,availability:'AVAILABLE',location:{lat:-31.37,lon:-61.20},location_source:'PHONE_GPS',location_updated_at:new Date().toISOString(),document_state:'GREEN'},
    {id:'VEH-08',carrier_id:'CAR-3',plate:'AD789GH',equipment_type:'sider',capacity_tn:28,availability:'AVAILABLE',location:{lat:-31.61,lon:-60.70},location_source:'MANUAL',location_updated_at:new Date().toISOString(),document_state:'GREEN'}
  ]
};
