// 精简运输车时按稳定槽位迁移，先合并货物再撤销旧车型所有权。
import {ERA_VEHICLES} from '../../config/vehicle-eras.js';
// 只合并计数，非法历史字段交给后续正式校验。
function mergeCounts(to={},from={}){
 for(const [key,n] of Object.entries(from||{}))if(Number.isFinite(n)&&n>0)to[key]=(Number(to[key])||0)+n;
 return to;
}
// 旧自行车归木制自行车，其余旧货运车归木马车；首次替换继承原车的停放状态。
export function migrateRetiredVehicles(raw){
 const retired=ERA_VEHICLES.filter(v=>v.retired&&raw.vehicleHulls?.[v.index]>0);
 if(!retired.length)return raw;
 const p=structuredClone(raw);
 for(const old of retired){
  const from=old.index,to=ERA_VEHICLES.find(v=>v.id===(old.id.includes('bicycle')?'wood-bicycle':'wood-wagon')).index,owned=p.vehicleHulls[to]>0;
  p.vehicleHulls[to]=Math.max(p.vehicleHulls[to]||0,p.vehicleHulls[from]);p.vehicleHulls[from]=0;
  if(p.logistics?.builds?.[from]){
   const source=p.logistics.builds[from],target=p.logistics.builds[to]??={cargo:[]};
   target.cargo??=[];mergeCounts(target.cargo,source.cargo);target.wood=(target.wood||0)+(source.wood||0);
   target.plates=Math.max(target.plates||0,source.plates||0);target.spares=(target.spares||0)+(source.spares||0);
   target.engines=[...new Set([...(target.engines||[0]),...(source.engines||[0])])];
   if(!owned)target.engine=source.engine;
   p.logistics.builds[from]={};
  }
  if(p.supplies?.vehicles?.[from]){p.supplies.vehicles[to]=mergeCounts(p.supplies.vehicles[to],p.supplies.vehicles[from]);p.supplies.vehicles[from]={};}
  if(p.shopStock?.[from]){p.shopStock[to]=mergeCounts(p.shopStock[to],p.shopStock[from]);delete p.shopStock[from];}
  if(p.industry?.vehicles?.[from]){p.industry.vehicles[to]=mergeCounts(p.industry.vehicles[to],p.industry.vehicles[from]);delete p.industry.vehicles[from];}
  if(p.campParking?.owned){
   const source=p.campParking.owned.find(r=>r.hull===from),target=p.campParking.owned.find(r=>r.hull===to);
   if(source&&!target)source.hull=to;
   p.campParking.owned=p.campParking.owned.filter(r=>r.hull!==from);
  }
  if(!owned&&p.vehicleService?.[from])p.vehicleService[to]=p.vehicleService[from];
  if(p.vehicleParts?.[from]){const target=p.vehicleParts[to]??={};for(const [key,n] of Object.entries(p.vehicleParts[from]))if(Number.isFinite(n))target[key]=Math.max(target[key]||1,n);}
  if(p.vehicleService)p.vehicleService[from]=null;
  if(p.vehicleIndex===from)p.vehicleIndex=to;
  if(p.patrol?.mountedVehicleIndex===from)p.patrol.mountedVehicleIndex=null;
  if(p.logistics?.tow&&[p.logistics.tow.tractor,p.logistics.tow.target].includes(from))p.logistics.tow=null;
  if(p.vehicleLoadouts)p.vehicleLoadouts[from]=null;
  if(p.outdoors?.tentHull===from)p.outdoors.tentHull=to;
  for(const part of Object.values(p.treasure?.parts||{}))if(part.hull===from)part.hull=to;
  if(p.equipmentGoal?.kind==='vehicle'&&p.equipmentGoal.index===from)p.equipmentGoal=null;
 }
 return p;
}
