export function resolveFutureAvailability(vehicle={},activeTrip=null,now=new Date()){
 if(activeTrip?.destination_location||activeTrip?.destination){
  return{location:activeTrip.destination_location||activeTrip.destination,available_at:activeTrip.expected_unload_at||activeTrip.delivery_at||null,source:'EXPECTED_UNLOAD',confidence:activeTrip.destination_location?'HIGH':'MEDIUM'};
 }
 if(vehicle.expected_available_location){return{location:vehicle.expected_available_location,available_at:vehicle.available_at||null,source:'PLANNED_AVAILABILITY',confidence:'MEDIUM'};}
 if(vehicle.location){return{location:vehicle.location,available_at:new Date(now).toISOString(),source:'CURRENT_LOCATION',confidence:vehicle.location_updated_at?'MEDIUM':'LOW'};}
 return{location:null,available_at:null,source:'UNKNOWN',confidence:'LOW'};
}
export function shouldPreSearch({availableAt,now=new Date(),leadMinutes=120}={}){
 if(!availableAt)return false;const diff=(new Date(availableAt)-new Date(now))/60000;return Number.isFinite(diff)&&diff<=leadMinutes&&diff>=-30;
}
