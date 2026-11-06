import {eraVehicle} from '../config/vehicle-eras.js';
// 停驻车体不绘制驾驶员；访客样车与玩家装备目录完全分离。
import {parkedOwned,campParkingVisible,VISITOR_MODELS} from '../core/camp-parking.js';
import {PARKING_SPOTS} from '../config/parking.js';
import {GARAGE} from '../world/workshop.js';
import {drawVehicleTracks,drawVehicleArmor} from './vehicle.js';
import {clipGarageOpening} from './garage.js';
import {box} from './primitives.js';
import {drawScienceVehicle} from './science-vehicles.js';
import {createVehicle} from '../combat/vehicle.js';
import {nativeVehicleWeapon} from '../config/vehicle-armaments.js';
const visitorPreviews=new WeakMap();

// 单一车位记录生成单一场景实体，停在室内的车与门框按固定深度合成。
export function parkedVehicleObjects(game){
 if(!campParkingVisible(game)||game.arrivalCinematic)return [];
 return [...parkedOwned(game).map(s=>({...s,hull:s.record.hull,owner:true})),...(game.mapId==='forest'?game.parkingVisitors||[]:[]).map(v=>({...PARKING_SPOTS.find(s=>s.id===v.spot),model:VISITOR_MODELS.find(m=>m.id===v.model)}))]
  .map(s=>({...s,type:'parked-vehicle',depthOffset:s.indoor?s.garageY+2-s.y:0}));
}
// 展示样车使用独立的原厂主炮快照，不能把展示配置写入玩家拥有列表。
function visitorPreview(game,hull){
 let cache=visitorPreviews.get(game.progress);if(!cache){cache=new Map();visitorPreviews.set(game.progress,cache);}
 if(!cache.has(hull)){
  const p={...game.progress,vehicleWeapons:[...game.progress.vehicleWeapons],vehicleLoadouts:[...game.progress.vehicleLoadouts]},native=nativeVehicleWeapon(hull)?.weaponIndex;
  if(Number.isInteger(native)){p.vehicleWeapons[native]=Math.max(1,p.vehicleWeapons[native]||0);p.vehicleLoadouts[hull]=native;}
  cache.set(hull,{progress:p,vehicle:createVehicle(p, hull)});
 }
 return cache.get(hull);
}
// 室内泊位和室外停驻车辆复用同一车体、轮相与装备绘制，始终不画驾驶员。
export function drawParkedHull(c,point,game,hull,record=null,visitor=false){
 const view=visitor?visitorPreview(game,hull):{vehicle:game.vehicles[hull],progress:game.progress},base=view.vehicle;
 const vehicle={...base,active:false,flash:0,angle:-Math.PI/2,wheelPhase:record?.wheel||0,recoil:{...base.recoil,kick:0,flash:0}};
 const at={...point,walkPhase:record?.track||0}, horse=eraVehicle(hull)?.horse;
 drawVehicleTracks(c,at,vehicle,true,0,view.progress);
 drawVehicleArmor(c,at,vehicle,view.progress,horse?game.time||0:0,horse?(game.reducedMotion??true):true);
}
// 复用原车轮、履带、装甲与独立炮塔，只有科幻样车使用自己的停机结构。
export function drawParkedVehicle(c,item,game){
 c.save();if(item.indoor)clipGarageOpening(c,{x:item.x,y:item.y-GARAGE.parkingY});
 if(item.model?.sciFi){c.translate(item.x,item.y);drawScienceVehicle(c,item.model);}
 else{
  drawParkedHull(c,item,game,item.hull??item.model.hull,item.record,!item.owner);
 }
 c.restore();
 // 仅访客车辆显示身份标签，自有车辆用自动上车圆环反馈，不叠提示词。
 if(!item.owner&&Math.hypot(game.player.x-item.x,game.player.y-item.y)<155){
  const text=item.model.sciFi?item.model.name+' · 非卖品':item.model.name+' · 访客';
  c.save();c.font='bold 11px sans-serif';c.textAlign='center';box(c,item.x-55,item.y+20,110,20,8,'#fff1c9','#6c8869',1);c.fillStyle='#41664b';c.fillText(text,item.x,item.y+34);c.restore();
 }
}
