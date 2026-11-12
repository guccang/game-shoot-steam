import {repairParkingReserved,repairParkingSpot} from '../../config/repair-parking.js';
import {parkingRecordSite,parkingRecordOccupies} from '../../progression/vehicles/roadside-parking.js';
import {vehicleService} from './vehicle-repair.js';
import {REPAIR_BAY} from '../../config/vehicle-repair.js';
// 驾驶和停驻是同一辆车的两种状态，靠近倒计时完成后重新上车。
import {PARKING_SPOTS,NORTH_PARKING} from '../../config/parking.js';
import {availableParkingSpot,parkNewVehicle,northParkingSpot} from '../../progression/vehicles/camp-parking.js';
import {FIRE_GARAGE} from '../../world/fire-navigation.js';
import {worldDistance,nearest} from '../../world/coordinates.js';
import {blocked} from '../../physics/motion.js';
import {dismountVehicle,summonVehicle} from '../../combat/vehicle.js';
import {RANGER,arrivalGiftHull} from '../../config/ranger-arrival.js';

import {VISITOR_MODELS} from '../../config/parking-visitors.js';
export {VISITOR_MODELS} from '../../config/parking-visitors.js';
// 只在正常营地显示停驻车，秘境与入职镜头不借用玩家车位。
export function campParkingVisible(game){return ['forest','jiuzhaigou'].includes(game.mapId)&&!game.realm&&!game.story&&!game.cottage;}
// 固定泊位与原地停车统一投影，其他地图的车辆不会出现在当前场景。
export function parkedOwned(game){return (game.progress.campParking?.owned||[]).map(record=>({...parkingRecordSite(record),record})).filter(site=>site.mapId===game.mapId);}
// 过场结束即可使用已有车辆，不把其他车体绑定到首枪教学。
export function arrivalParkingAllowed(game){return !game.arrivalCinematic;}
// 剧情借车、秘境整备、消防出动和试驾继续使用各自的临时装备，不受营地停车限制。
export function parkingFleetApplies(game){return !game.realm&&!game.story&&!game.fireActive&&!game.campDefense&&!game.workshopTrial&&arrivalParkingAllowed(game);}
// 页面与导航读取同一实际停放地点；消防任务车保留消防站的专用车库。
export function vehicleParkingSite(game,hull){
 if(vehicleService(game,hull)?.phase)return {...(repairParkingSpot(vehicleService(game,hull))||REPAIR_BAY),id:'vehicle-repair',name:'载具维修中心',mapId:'forest'};
 if(hull===4&&game.fireGarageParked)return {...FIRE_GARAGE,id:'fire-garage',name:'消防站车库',mapId:'forest'};
 const record=game.progress.campParking?.owned.find(r=>r.hull===hull),parked=record&&parkingRecordSite(record);
 return parked?parked:{id:'north-parking',name:'北停车场',mapId:'forest',...NORTH_PARKING.entrance};
}
// 只能在停车区域选用另一辆自有车，携带的旧车会留在停车场而不跟随出发。
export function canSelectParkingVehicle(game,hull){
 if(!parkingFleetApplies(game))return true;
 if(game.cottage||!['playing','paused'].includes(game.state))return false;
 const site=vehicleParkingSite(game,hull);
 return site.mapId===game.mapId&&worldDistance(game.player,site)<=155;
}
// 换乘前保存随行车的耐久与供给；已有停驻记录的车不被移动到另一个泊位。
export function storeCarriedVehicle(game,v=game.vehicle){
 const p=game.progress;p.campParking??={owned:[]};
 if(vehicleService(game,v.index)?.phase)return true;
 if(!p.vehicleHulls[v.index]||p.campParking.owned.some(r=>r.hull===v.index)||v.index===4&&game.fireGarageParked)return true;
 if(v.active&&v===game.vehicle)return dismountVehicle(game);
 const spot=availableParkingSpot(p,v.index);if(!spot)return false;
 p.campParking.owned.push({hull:v.index,spot:spot.id,hp:v.hp/v.maxHp,ammo:v.module?.magazine.ammo||0,reload:v.module?.magazine.remaining||0,wheel:v.wheelPhase||0,track:game.player.walkPhase||0});
 game.parkingVisitors=(game.parkingVisitors||[]).filter(r=>r.spot!==spot.id);return true;
}
// 两辆场内车可互换固定车位，路边车辆与第三辆车的预留位仍属占用。
export function canAssignParkingSpot(game,hull,spot){
 const {owned,preferred={}}=game.progress.campParking;
 const current=owned.find(r=>r.hull===hull);
 const occupant=owned.find(r=>r.hull!==hull&&parkingRecordOccupies(r,spot));
 const swap=occupant?.spot===spot.id&&PARKING_SPOTS.some(s=>s.number&&s.id===current?.spot);
 if(occupant&&!swap)return false;
 if(Object.entries(preferred).some(([h,id])=>Number(h)!==hull&&id===spot.id&&Number(h)!==occupant?.hull))return false;
 if(swap&&Object.entries(preferred).some(([h,id])=>id===current.spot&&Number(h)!==hull&&Number(h)!==occupant.hull))return false;
 return !(spot.id===game.parking?.id&&['align','reverse'].includes(game.parking.phase))&&!(spot.id===RANGER.parkingId&&game.progress.arrival?.parked);
}
// 指定常用车位时直接整理场内车辆，随行和外地车辆保留现状，下次归场使用设置。
export function assignParkingSpot(game,hull,id,persist=game.livingPersist){
 const p=game.progress,parking=p.campParking;
 if(!Number.isInteger(hull)||!p.vehicleHulls[hull])return false;
 const spot=PARKING_SPOTS.find(s=>s.number&&s.id===id);
 if(id&&(!spot||!canAssignParkingSpot(game,hull,spot)))return false;
 const next={...parking,preferred:{...parking.preferred},owned:parking.owned.slice()};
 if(id)next.preferred[hull]=id;else delete next.preferred[hull];
 const i=next.owned.findIndex(r=>r.hull===hull);
 if(spot&&i>=0&&next.owned[i].spot){
  const other=next.owned.findIndex(r=>r.hull!==hull&&r.spot===id);
  if(other>=0){
   const previous=next.owned[i].spot,otherHull=next.owned[other].hull;
   next.owned[other]={...next.owned[other],spot:previous};
   if(next.preferred[otherHull]===id)next.preferred[otherHull]=previous;
  }
  next.owned[i]={...next.owned[i],spot:id};
 }
 if(spot&&i<0&&hull!==p.vehicleIndex&&!vehicleService(game,hull)?.phase&&!(hull===4&&game.fireGarageParked))parkNewVehicle({...p,campParking:next},hull);
 try{if(persist?.({...p,campParking:next})!==true)return false;}catch{return false;}
 p.campParking=next;
 if(id)game.parkingVisitors=(game.parkingVisitors||[]).filter(v=>v.spot!==id);
 game.onEvent?.('camp-parking-change');return true;
}
// 同一车体和同一泊位最多一辆，倒车中的预约也不允许访客占用。
export function parkingOccupied(game,id){const spot=PARKING_SPOTS.find(s=>s.id===id);return repairParkingReserved(game.progress,id)||!!spot&&game.progress.campParking.owned.some(r=>parkingRecordOccupies(r,spot))||(game.parkingVisitors||[]).some(s=>s.spot===id)||id===RANGER.parkingId&&game.progress.arrival?.parked&&!game.arrivalCinematic;}
// 交接完成后接管北广场赠车，不移动到未修复车库，也不重复占位。
export function adoptArrivalParking(game){
 const hull=arrivalGiftHull(game.progress);
 if(!arrivalParkingAllowed(game)||!game.progress.arrival?.keys||!game.progress.arrival.parked||!game.progress.vehicleHulls[hull])return;
 const owned=game.progress.campParking.owned;
 if(!owned.some(s=>s.hull===hull)){
  const spot=!owned.some(s=>s.spot===RANGER.parkingId)?PARKING_SPOTS.find(s=>s.id===RANGER.parkingId):northParkingSpot(game.progress,hull);
  if(!spot)return;
  owned.push({hull,spot:spot.id,hp:1,ammo:0,reload:0,wheel:0,track:0});
 }
 game.progress.arrival.parked=false;game.onEvent('camp-parking-change');
}
// 下车点优先在泊位侧面；车库门外落点独立于候停范围，避免缩短过道后落在自动进门区。
export function disembarkPoint(game,spot){
 const center=nearest(spot,game.player),front=nearest({x:spot.x,y:spot.disembarkY??spot.approachY+18},game.player);
 const candidates=spot.indoor?[front]:[{x:center.x+64,y:center.y+18},{x:center.x-64,y:center.y+18},front];
 return candidates.find(p=>!blocked(p.x,p.y,12,game.trees,game.player))||front;
}
// 入位先保存车体状态再恢复步行；工坊弹窗打开与关闭都不再把驾驶员绑在车上。
export function leaveParkedVehicle(game,spot){
 const v=game.vehicle;if(!v.active)return false;
 const record={hull:v.index,spot:spot.id,hp:v.hp/v.maxHp,ammo:v.module?.magazine.ammo||0,reload:v.module?.magazine.remaining||0,wheel:v.wheelPhase||0,track:game.player.walkPhase||0};
 if(!dismountVehicle(game))return false;
 game.progress.campParking.owned=game.progress.campParking.owned.filter(s=>s.hull!==v.index&&s.spot!==spot.id);
 game.progress.campParking.owned.push(record);
 Object.assign(game.player,disembarkPoint(game,spot),{vx:0,vy:0,pushX:0,pushY:0});
 game.onEvent('camp-parking-change');return true;
}
// 自动上车完成后复用此事务入口，统一校验距离、场景与耐久。
export function boardParkedVehicle(game,hull){
 const parked=parkedOwned(game).find(s=>s.record.hull===hull);
 if(!parked||!campParkingVisible(game)||!arrivalParkingAllowed(game,hull)||game.fireActive||game.campDefense||game.workshopTrial||!['playing','paused'].includes(game.state)||game.vehicle.active&&game.vehicle.index===hull||worldDistance(game.player,parked)>155)return false;
 const v=game.vehicles[hull];if(!v||v.active||v.cooldown>0||!game.progress.vehicleHulls[hull])return false;
 if(v.hp<=0||parked.record.hp<=0||vehicleService(game,hull)?.phase){game.onEvent('story-hint',{text:'载具已损坏，需要维修。请用手机呼叫救援。'});return false;}
 if(game.vehicle.index!==hull&&!storeCarriedVehicle(game,game.vehicle,parked))return false;
 // 满位时旧车已进入目标泊位，新车落在原驾驶位置；不能和旧车叠在同一泊位。
 const boarding=game.progress.campParking.owned.some(r=>r.spot===parked.id&&r.hull!==hull)?{x:game.player.x,y:game.player.y}:nearest(parked,game.player);
 game.vehicle=v;game.progress.vehicleIndex=hull;
 v.hp=Math.min(v.maxHp,Math.max(0,parked.record.hp*v.maxHp));v.wheelPhase=parked.record.wheel;
 if(v.module){v.module.magazine.ammo=Math.min(v.module.magazine.ammo,parked.record.ammo);v.module.magazine.remaining=Math.max(v.module.magazine.remaining,parked.record.reload);}
 const boardingFrom={x:game.player.x,y:game.player.y};
 if(!summonVehicle(game))return false;
 Object.assign(game.player,boarding,{vx:0,vy:0,pushX:0,pushY:0,walkPhase:parked.record.track});
 game.progress.campParking.owned=game.progress.campParking.owned.filter(s=>s.hull!==hull);
 // 上车时不再次候停，须先驶离，防止刚上车又被自动赶下来。
 game.parking=parked.record.spot?{id:parked.id,hull,phase:'cancelled',idle:false}:null;
 game.onEvent('camp-parking-change',{boardingFrom});return true;
}
// 出屋、读档和移动共用停车实体边界，室内查询也返回室外车辆，不依赖上一帧缓存。
export function parkingCollisionBarriers(game){
 const sites=[...parkedOwned(game)];
 if(game.mapId==='forest')sites.push(...(game.progress.vehicleService||[]).map(repairParkingSpot).filter(Boolean),...(game.parkingVisitors||[]).map(v=>PARKING_SPOTS.find(s=>s.id===v.spot)).filter(Boolean));
 return sites.map(s=>({x:s.x,y:s.y-20,width:72,height:60}));
}
// 访客在看不到的空位轮换，两个空位和所有自有车、倒车预约始终保留。
export function updateParkingVisitors(game,dt){
 if(!campParkingVisible(game)||!arrivalParkingAllowed(game)){game.player.parkingBarriers=[];return;}
 if(game.state!=='playing')return;
 if(game.mapId!=='forest'){game.parkingVisitors=[];game.player.parkingBarriers=parkingCollisionBarriers(game);return;}
 adoptArrivalParking(game);
 // 新购与赠礼车辆优先占位，访客不能与自有车重叠。
 game.parkingVisitors=(game.parkingVisitors||[]).filter(v=>!game.progress.campParking.owned.some(r=>parkingRecordOccupies(r,PARKING_SPOTS.find(s=>s.id===v.spot))));
 game.parkingVisitors||=[];game.parkingVisitTimer??=8;
 // 停车实体只给当前玩家提供脚底碰撞，不改动入职导演和居民路线。
 game.player.parkingBarriers=parkingCollisionBarriers(game);
 // 入职任务期间开放赠车与碰撞，访客轮换仍等任务结束，避免干扰引导。
 if(game.arrivalPending)return;
 game.parkingVisitTimer-=dt;if(game.parkingVisitTimer>0)return;
 const view=game.parkingView;
 const outside=s=>{const p=nearest(s,game.player);return view?!((p.x+60>view.x)&&(p.x-60<view.x+view.w)&&(p.y+35>view.y)&&(p.y-100<view.y+view.h)):worldDistance(s,game.player)>650;};
 const editable=PARKING_SPOTS.filter(s=>s.building==='north'&&outside(s)&&s.id!==game.parking?.id);
 if(!editable.length){game.parkingVisitTimer=5;return;}
 game.parkingVisitors=game.parkingVisitors.filter(v=>!editable.some(s=>s.id===v.spot));
 const reserved=Object.values(game.progress.campParking.preferred||{});
 const available=editable.filter(s=>!reserved.includes(s.id)&&!parkingOccupied(game,s.id));
 const free=PARKING_SPOTS.filter(s=>s.building==='north'&&!parkingOccupied(game,s.id)).length;
 const count=Math.min(available.length,3-game.parkingVisitors.length,Math.max(0,free-2),2+Math.floor(game.random()*2));
 for(let i=0;i<count;i++){
  const slot=available.splice(Math.floor(game.random()*available.length),1)[0];
  // 同批车避免全是同一剪影，优先让高级车与非卖科幻车各有一辆。
  const unused=VISITOR_MODELS.filter(m=>!game.parkingVisitors.some(v=>v.model===m.id));
  const preferred=game.parkingVisitors.length===0?unused.filter(m=>!m.sciFi):!game.parkingVisitors.some(v=>VISITOR_MODELS.find(m=>m.id===v.model)?.sciFi)?unused.filter(m=>m.sciFi):unused;
  const choices=preferred.length?preferred:unused.length?unused:VISITOR_MODELS;
  // 优先抽取本轮尚未展示的型号，整套展示后重新洗牌，避免连续重复同一艘样车。
  game.parkingVisitorHistory??=[];let pool=choices.filter(m=>!game.parkingVisitorHistory.includes(m.id));
  if(!pool.length){game.parkingVisitorHistory=game.parkingVisitorHistory.filter(id=>!choices.some(m=>m.id===id));pool=choices;}
  const model=pool[Math.min(pool.length-1,Math.floor(game.random()*pool.length))];game.parkingVisitorHistory.push(model.id);game.parkingVisitors.push({spot:slot.id,model:model.id});
 }
 game.parkingVisitTimer=45+game.random()*75;
}
