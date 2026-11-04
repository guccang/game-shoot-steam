import {townStandingPoint} from './town-layout.js';
import {updateHomeArcade} from './home-arcade.js';
import {MINING} from '../config/mining.js';
import {updateMining,enterMine,updateMineEntrance} from './mining.js';
import {travelHomeFloor,enterHomeBalcony,leaveHomeBalcony} from './home-construction.js';
import {HOME_BALCONY,HOME_DIRECTIONS,HOME_ELEVATOR,floorBalconies,hasHomeElevator,homeStairRoutes} from '../config/home-construction.js';
import {bossCombatActive} from './boss-engagement.js';
import {PARKING_SPOTS} from '../config/parking.js';
import {dismountVehicle} from '../combat/vehicle.js';
import {blocked} from '../physics/motion.js';
import {movementLoadFactor} from '../progression/load-weight.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';
import {facilityOpen} from '../config/town-restoration.js';
// 小屋使用独立局部坐标，外部巡游状态留在原地，睡眠推进正式历法并恢复猫猫生命。
import {WORKSHOP_INTERIORS,interiorLayout,interiorFurniture} from '../config/workshop-interiors.js';
import {COTTAGE as C,COTTAGE_FURNITURE,COTTAGE_STAIRS,cottageFloor} from '../config/cottage.js';
import {worldDistance,nearest} from '../world/coordinates.js';
import {updateCatMotion} from './cat-motion.js';
import {calendarView,advanceLivingCalendar} from '../world/living-calendar.js';
import {LIVING_DAY_MS} from '../config/living-world.js';

// 步行和驾驶都可在门前候停；过场、事件战斗和自动倒车期间不抢占控制。
export function canEnterCottage(game){return game.mapId==='forest'&&!game.realm&&!game.story&&!game.arrivalCinematic&&!game.fireActive&&!game.campDefense&&!bossCombatActive(game)&&!game.livingBattle&&!game.workshopTrial&&!['align','reverse'].includes(game.parking?.phase);}
// 兼容旧调用方的资格查询，实际入室仍核验门口范围。
export function canClickCottage(game){return !game.cottage&&!game.vehicle.active&&canEnterCottage(game)&&game.state==='playing'&&!game.progress.restoration?.build&&!game.mainlineSpeech&&facilityOpen(game.progress,'cottage')&&worldDistance(game.player,C.door)<=C.clickRadius;}
// 门前候停完成后交给正式房间控制器。
export function enterCottage(game){return canClickCottage(game)&&enterInterior(game,'cottage');}
// 两座工坊沿用小屋的距离和步行校验，入职重建仍使用自己的剧情入口。
export function enterWorkshop(game,kind){return !!WORKSHOP_INTERIORS[kind]&&enterInterior(game,kind);}
// 仅正式库内泊车完成后使用门外下车点入屋，不放宽普通步行进门的距离限制。
export function enterParkedWorkshop(game,parkingId){
 const spot=PARKING_SPOTS.find(s=>s.id===parkingId),state=game.parking;
 if(!spot?.indoor||!WORKSHOP_INTERIORS[spot.kind]||state?.id!==spot.id||state.phase!=='parked'||state.hull!==game.vehicle.index||!game.progress.campParking.owned.some(r=>r.hull===state.hull&&r.spot===spot.id))return false;
 return enterInterior(game,spot.kind,{x:spot.x,y:spot.disembarkY??spot.approachY+18});
}
// 入室前保存世界落点，室内使用独立坐标，存档仍记录外部安全位置。
function enterInterior(game,kind,parkingEntrance=null,mountedCountdown=false){
 // 仓库使用室外存取页面，不再切换室内坐标或让驾驶员下车。
 if(kind==='warehouse')return false;
 if(!facilityOpen(game.progress,kind==='vehicle'?'garage':kind))return false;
 const layout=interiorLayout({kind});
 if(kind==='legendary'&&!game.progress.vehicleHulls[6])return false;
 if(game.cottage||!canEnterCottage(game)||game.state!=='playing'||game.progress.restoration?.build||game.mainlineSpeech||worldDistance(game.player,parkingEntrance||layout.door)>layout.radius)return false;
 // 驾驶入屋只能由完整倒计时提交；先在门口留下真实车辆，再切换室内坐标。
 if(game.vehicle.active&&(!mountedCountdown||!parkDoorVehicle(game)))return false;
 const outside=townStandingPoint(game,nearest(layout.outside||{x:C.door.x+50,y:C.door.y+30},game.player));
 if(!outside)return false;
 game.cottage={kind,floor:0,outside,notice:kind==='cottage'?'到家了。床边可以休息。':'在售货员柜台前站定1秒，查看服务。',sleep:null,stairsElapsed:null,stairsLatch:false,exitElapsed:0,restElapsed:null,bedLatch:false};game.cottageEntry=null;game.cottageEntryKind=null;game.vehicleBoarding=null;game.vehicleBoardingBlocked=null;game.parking=null;game.mainlineSpeech=null;
 Object.assign(game.player,layout.spawn,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent('cottage-change');return true;
}
// 门槛附近按停驻车体校验空地，向门外小幅避让墙体；失败保留驾驶状态和原位置。
function parkDoorVehicle(game){
 const origin={x:game.player.x,y:game.player.y},body={...game.player,flying:false,amphibious:false,treePass:false};
 for(let offset=0;offset<=96;offset+=16){
  const point={x:origin.x,y:origin.y+offset};if(blocked(point.x,point.y,30,game.trees,body))continue;
  Object.assign(game.player,point);
  if(dismountVehicle(game))return true;
  Object.assign(game.player,origin);return false;
 }
 return false;
}
// 家具按脚底底座碰撞；屋内一条中间通道连接床边与门口。
export function cottageBlocked(x,y,game){if(game?.cottage?.balcony)return x<24||x>HOME_BALCONY.width-24||y<42||y>HOME_BALCONY.height-18;const layout=interiorLayout(game?.cottage),furniture=game?interiorFurniture(game):COTTAGE_FURNITURE;return x<22||x>layout.width-22||y<76||y>layout.height-20||furniture.some(f=>Math.abs(x-f.x)<f.width/2+10&&Math.abs(y-f.y)<f.height/2+10);}
// 门口、床边判定与室内行走共用正式输入，暂停不累积倒计时或睡眠过渡。
export function updateCottage(game,dt,input){
 if(updateHomeArcade(game,dt))return true;
 if(updateMining(game,dt,input))return true;
 if(game.cottage){
  if(game.state!=='playing')return true;
  const room=game.cottage,p=game.player,layout=interiorLayout(room);
  if(room.sleep){room.stairsElapsed=null;room.elevatorElapsed=null;room.elevatorRequest=false;room.sleep.elapsed+=dt;if(room.sleep.elapsed>=1.2){finishCottageSleep(game);room.sleep=null;}updateCatMotion(p.bodyAnimation,dt,0,false);return true;}
  const before={x:p.x,y:p.y},length=Math.max(1,Math.hypot(input.x,input.y)),speed=115*movementLoadFactor(game),dx=input.x/length*speed*dt,dy=input.y/length*speed*dt;
  if(!cottageBlocked(p.x+dx,p.y,game))p.x+=dx;if(!cottageBlocked(p.x,p.y+dy,game))p.y+=dy;
  p.vx=(p.x-before.x)/Math.max(dt,.001);p.vy=(p.y-before.y)/Math.max(dt,.001);
  updateCatMotion(p.bodyAnimation,dt,Math.hypot(p.vx,p.vy),true);game.time+=dt;
  if(room.balcony){
   const near=Math.hypot(p.x-HOME_BALCONY.exit.x,p.y-HOME_BALCONY.exit.y)<=HOME_BALCONY.radius;
   if(!near)room.balconyLatch=false;
   room.balconyExitElapsed=near&&!room.balconyLatch&&Math.hypot(input.x,input.y)<.01?(room.balconyExitElapsed||0)+dt:0;
   if(room.balconyExitElapsed>=1)leaveHomeBalcony(game);return true;
  }
  const doors=room.kind==='cottage'?floorBalconies(game.progress.homeDecor,cottageFloor(room)):[],nearDoor=doors.find(side=>Math.hypot(p.x-HOME_DIRECTIONS[side].door.x,p.y-HOME_DIRECTIONS[side].door.y)<=32);
  if(!nearDoor)room.balconyLatch=false;
  room.balconyElapsed=nearDoor&&!room.balconyLatch&&Math.hypot(input.x,input.y)<.01?(room.balconyElapsed||0)+dt:0;
  if(room.balconyElapsed>=1&&enterHomeBalcony(game,nearDoor))return true;
  if(updateCottageStairs(game,dt,input))return true;
  // 地下室梯口与原楼梯一样先走近再候停，返回后离开梯口才重新触发。
  if(room.kind==='cottage'&&!cottageFloor(room)&&game.progress.homeDecor.basement){
   const near=Math.hypot(p.x-MINING.hatch.goal.x,p.y-MINING.hatch.goal.y)<=28;
   if(!near)room.basementLatch=false;
   room.basementElapsed=near&&!room.basementLatch&&Math.hypot(input.x,input.y)<.01?(room.basementElapsed||0)+dt:0;
   if(room.basementElapsed>=1&&enterMine(game))return true;
  }
  // 床前站定一秒直接入睡，移动取消，醒来须先离开床边才能再次触发。
  const nearBed=(!room.kind||room.kind==='cottage')&&!cottageFloor(room)&&Math.hypot(p.x-C.bed.x,p.y-C.bed.y)<=C.bedRadius;
  if(!nearBed)room.bedLatch=false;
  if(!nearBed||room.bedLatch||p.hp<=0||Math.hypot(input.x,input.y)>.01)room.restElapsed=null;
  else {const tick=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;room.restElapsed=room.restElapsed==null?0:room.restElapsed+tick;if(room.restElapsed+1e-9>=C.bedWait){sleepInCottage(game);return true;}}
  room.exitElapsed=!(room.kind==='cottage'&&cottageFloor(room)>0)&&Math.hypot(input.x,input.y)<=.01&&Math.hypot(p.x-layout.exit.x,p.y-layout.exit.y)<=layout.exitRadius?(room.exitElapsed||0)+dt:0;
  if(room.exitElapsed+1e-9>=layout.exitWait)leaveCottage(game);
  return true;
 }
 if(!canEnterCottage(game)||game.progress.restoration?.build||game.mainlineSpeech||game.vehicleBoarding){game.cottageEntry=null;game.cottageEntryKind=null;game.mineEntranceWait=0;game.mineEntranceKey=null;return false;}
 // 页面暂停不消耗等待时间，关闭后继续；步行和驾驶移动或离开门口立即取消。
 if(game.state!=='playing')return false;
 if(updateMineEntrance(game,dt,input))return true;
 const layouts=[interiorLayout({kind:'cottage'}),...Object.values(WORKSHOP_INTERIORS)].filter(r=>r.id!=='warehouse'&&(r.id!=='legendary'||game.progress.vehicleHulls[6]));
 const layout=layouts.reduce((best,item)=>worldDistance(game.player,item.door)<worldDistance(game.player,best.door)?item:best);
 if(game.cottageDoorLatch){
  const latched=layouts.find(r=>r.id===(game.cottageDoorLatch===true?'cottage':game.cottageDoorLatch));
  if(!latched||worldDistance(game.player,latched.door)>latched.radius+18)game.cottageDoorLatch=false;
  else {game.cottageEntry=null;game.cottageEntryKind=null;return false;}
 }
 if(!facilityOpen(game.progress,layout.id==='vehicle'?'garage':layout.id)||worldDistance(game.player,layout.door)>layout.radius||Math.hypot(input.x,input.y)>.01||Math.hypot(game.player.vx||0,game.player.vy||0)>3){game.cottageEntry=null;game.cottageEntryKind=null;return false;}
 if(game.cottageEntryKind!==layout.id)game.cottageEntry=0;
 game.cottageEntryKind=layout.id;game.cottageEntry=(game.cottageEntry||0)+dt;
 return game.cottageEntry+1e-9>=layout.wait?enterInterior(game,layout.id,null,true):false;
}
// 出门恢复世界坐标；离开门口后才重新允许站立倒计时。
export function leaveCottage(game){
 if(!game.cottage||game.cottage.kind==='mine'||game.cottage.balcony||game.cottage.sleep||game.state!=='playing'||game.cottage.kind==='cottage'&&cottageFloor(game.cottage)>0)return false;
 // 门外可能在入屋期间新增停车实体，离开前再次确认，不能把角色放进车身。
 const outside=townStandingPoint(game,game.cottage.outside);if(!outside){game.cottage.notice='门外暂时没有安全落脚点，请稍后再试。';return false;}
 const kind=game.cottage.kind||'cottage';Object.assign(game.player,outside,{vx:0,vy:0,pushX:0,pushY:0});game.cottage=null;game.cottageDoorLatch=kind==='cottage'?true:kind;game.onEvent('cottage-change');return true;
}
// 预告和实际休息共用同一目标日期，不修改传入的正式历法。
export function cottageSleepTarget(calendar,mode){
 const target={...calendar};
 advanceLivingCalendar(target,mode==='morning'?LIVING_DAY_MS-calendar.elapsed:calendarView(calendar).remaining);
 return target;
}
// 只有床前完整候停后才入睡，自动睡到明早，结算仍由原保存事务完成。
export function sleepInCottage(game){
 const mode='morning';
 if(!game.cottage||game.cottage.balcony||cottageFloor(game.cottage)!==0||game.cottage.kind&&game.cottage.kind!=='cottage'||game.cottage.sleep||game.state!=='playing'||game.player.hp<=0||game.cottage.bedLatch||game.cottage.restElapsed==null||game.cottage.restElapsed+1e-9<C.bedWait||Math.hypot(game.player.x-C.bed.x,game.player.y-C.bed.y)>C.bedRadius)return false;
 game.cottage.exitElapsed=0;game.cottage.restElapsed=null;game.cottage.bedLatch=true;game.player.vx=game.player.vy=0;
 game.cottage.sleep={mode,elapsed:0,target:cottageSleepTarget(game.progress.living.calendar,mode)};game.cottage.restResult='';game.cottage.notice='好好睡一觉……';return true;
}
// 保存成功才兑现跳时；失败留在屋内，可再次休息，不补领任何战斗或委托奖励。
function finishCottageSleep(game){
 // 入睡时锁定清晨目标，睡眠过渡中即使自然跨过时段也不会多睡一段。
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress)),calendar={...game.cottage.sleep.target},hp=game.maxHp();next.living.calendar=calendar;
 // 回血、首次休息和外部安全位置写入同一个候选存档，失败不兑现任何一项。
 next.restoration.cottageRested=true;
 const snapshot=Object.create(game);snapshot.progress=next;snapshot.player={...game.player,hp};next.patrol=capturePatrol(snapshot);
 let saved=false;try{saved=(game.livingPersist?.(next)??true)===true;}catch{saved=false;}
 if(!saved){game.cottage.restResult=game.cottage.notice='暂时没保存成功，再试一次吧。';return;}
 game.progress=next;game.player.hp=hp;
 // 保存和回血均成功后显示当前生命，失败分支不产生恢复成功提示。
 game.cottage.restResult=game.cottage.notice=`HP 已恢复至满值（${hp}/${hp}）`;game.onEvent('cottage-change');
}

// 双向入口分别候停，方向改变重启计时；电梯替换本层楼梯并打开真实乘梯服务。
function updateCottageStairs(game,dt,input){
 const room=game.cottage,home=game.progress.homeDecor,floor=cottageFloor(room),moving=Math.hypot(input.x,input.y)>.01;
 if(room.kind!=='cottage'||game.player.hp<=0){room.stairsElapsed=null;room.stairsTarget=null;room.elevatorElapsed=null;room.elevatorRequest=false;return false;}
 const tick=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
 if(hasHomeElevator(home,floor)){
  room.stairsElapsed=null;room.stairsTarget=null;
  const near=Math.hypot(game.player.x-HOME_ELEVATOR.landing.x,game.player.y-HOME_ELEVATOR.landing.y)<=HOME_ELEVATOR.radius;
  if(!near)room.elevatorLatch=false;
  if(!near||moving||room.elevatorLatch){room.elevatorElapsed=null;return false;}
  room.elevatorElapsed=room.elevatorElapsed==null?0:room.elevatorElapsed+tick;
  if(room.elevatorElapsed+1e-9<COTTAGE_STAIRS.wait)return false;
  room.elevatorElapsed=null;room.elevatorLatch=true;room.elevatorRequest=true;return true;
 }
 room.elevatorElapsed=null;room.elevatorRequest=false;
 const route=homeStairRoutes(home,floor).find(r=>Math.hypot(game.player.x-r.goal.x,game.player.y-r.goal.y)<=COTTAGE_STAIRS.radius);
 if(!route)room.stairsLatch=false;
 if(!route||moving||room.stairsLatch){room.stairsElapsed=null;room.stairsTarget=null;return false;}
 if(room.stairsTarget!==route.target){room.stairsElapsed=null;room.stairsTarget=route.target;}
 room.stairsElapsed=room.stairsElapsed==null?0:room.stairsElapsed+tick;
 return room.stairsElapsed+1e-9>=COTTAGE_STAIRS.wait&&changeCottageFloor(game);
}
// 候停方向由真实入口决定，中间层可下楼，不再以“尚未到顶层”替玩家选向上。
export function changeCottageFloor(game){
 const room=game.cottage;if(!room||room.kind!=='cottage'||room.sleep||room.balcony||game.player.hp<=0||room.stairsLatch||room.stairsElapsed==null||room.stairsElapsed+1e-9<COTTAGE_STAIRS.wait||game.state!=='playing')return false;
 return travelHomeFloor(game,room.stairsTarget);
}
