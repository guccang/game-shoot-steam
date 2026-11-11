import {COLLECTED_VEHICLES} from '../../config/vehicles.js';
import {parkingRecordOccupies} from './roadside-parking.js';
// 停驻存档只接受已拥有车体和真实泊位；访客不写入玩家装备。
import {parkingSpotsFor} from '../../config/parking.js';
import {vehicleWeapon} from '../../config/vehicles.js';
// 北停车场为自有车辆预留位置，访客不进入持久化占位表。
export function northParkingSpot(progress,hull,available=null){
 const spots=parkingSpotsFor(progress),preferred=progress.campParking?.preferred||{};
 const free=s=>s.number&&(!available||available(s))&&!Object.entries(preferred).some(([h,id])=>Number(h)!==hull&&id===s.id)&&!progress.campParking?.owned?.some(r=>r.hull!==hull&&parkingRecordOccupies(r,s));
 return spots.find(s=>s.id===preferred[hull]&&free(s))||spots.find(free);
}
// 北场满位后使用既有工坊泊位，购买与停驻共用容量判断。
export function availableParkingSpot(progress,hull){
 return northParkingSpot(progress,hull)||parkingSpotsFor(progress).find(s=>['garage','weapons'].includes(s.building)&&!progress.campParking?.owned?.some(r=>r.hull!==hull&&parkingRecordOccupies(r,s)));
}
// 新车与旧档未携带车辆归入北停车场，记录默认满供给但不改当前选用车辆。
export function parkNewVehicle(progress,hull){
 if(!progress.vehicleHulls[hull]||progress.vehicleService?.[hull]?.phase)return false;
 progress.campParking??={owned:[]};
 if(progress.campParking.owned.some(r=>r.hull===hull))return true;
 // 车型超过北场容量时使用既有工坊泊位，不凭空丢失新购车辆或挤占已有车。
 const spot=availableParkingSpot(progress,hull);if(!spot)return false;
 const weapon=vehicleWeapon(progress,progress.vehicleLoadouts[hull]);
 progress.campParking.owned.push({hull,spot:spot.id,hp:1,ammo:weapon?.magazineSize||0,reload:0,wheel:0,track:0});return true;
}
// 读档和扩建时安置缺少记录的自有车辆，随行车、消防站和维修中的车保留原状态。
export function parkMissingFleet(progress){
 for(const [hull,owned] of progress.vehicleHulls.entries()){
  if(owned&&hull!==progress.vehicleIndex&&!(hull===4&&progress.fireDispatch?.garage?.parked))parkNewVehicle(progress,hull);
 }
}
// 按车体和泊位双重去重，损坏记录不能创造车辆或重复占位。
export function normalizeCampParking(raw,progress){
 const parking=parkingSpotsFor(progress),preferred={};
 for(const [h,id] of Object.entries(raw?.preferred||{}))if(String(Number(h))===h&&progress.vehicleHulls[h]&&parking.some(s=>s.number&&s.id===id)&&!Object.values(preferred).includes(id))preferred[h]=id;
 const owned=[],hulls=new Set(),spots=new Set();
 for(const value of Array.isArray(raw?.owned)?raw.owned:[]){
  const roadside=value?.spot==null&&['forest','jiuzhaigou'].includes(value?.mapId)&&Number.isFinite(value.x)&&Number.isFinite(value.y);
  if(progress.vehicleService?.[value?.hull]?.phase||!(Number.isInteger(value?.hull)&&COLLECTED_VEHICLES[value.hull])||!progress.vehicleHulls[value.hull]||value.hull===4&&progress.fireDispatch?.garage?.parked||(!roadside&&!parking.some(s=>s.id===value.spot))||hulls.has(value.hull)||(!roadside&&spots.has(value.spot)))continue;
  const finite=(n,lo,hi,fallback)=>Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;
  owned.push({hull:value.hull,spot:roadside?null:value.spot,...(roadside?{mapId:value.mapId,x:value.x,y:value.y}:{}),hp:finite(value.hp,0,1,1),ammo:finite(value.ammo,0,100000,0),reload:finite(value.reload,0,120,0),wheel:finite(value.wheel,-1e6,1e6,0),track:finite(value.track,0,1000,0)});
  hulls.add(value.hull);if(!roadside)spots.add(value.spot);
 }
 return Object.keys(preferred).length?{owned,preferred}:{owned};
}
