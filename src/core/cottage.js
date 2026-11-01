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
export function canEnterCottage(game){return game.mapId==='forest'&&!game.realm&&!game.story&&!game.arrivalCinematic&&!game.fireActive&&!game.campDefense&&!game.boss&&!game.livingBattle&&!game.workshopTrial&&!['align','reverse'].includes(game.parking?.phase);}
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
 if(!facilityOpen(game.progress,kind==='vehicle'?'garage':kind))return false;
 const layout=interiorLayout({kind});
 if(kind==='legendary'&&!game.progress.vehicleHulls[6])return false;
 if(game.cottage||!canEnterCottage(game)||game.state!=='playing'||game.progress.restoration?.build||game.mainlineSpeech||worldDistance(game.player,parkingEntrance||layout.door)>layout.radius)return false;
 // 驾驶入屋只能由完整倒计时提交；先在门口留下真实车辆，再切换室内坐标。
 if(game.vehicle.active&&(!mountedCountdown||!parkDoorVehicle(game)))return false;
 const outside=nearest(layout.outside||{x:C.door.x+50,y:C.door.y+30},game.player);
 game.cottage={kind,floor:0,outside,notice:kind==='cottage'?'到家了。床边可以休息。':'点击售货员，查看服务。',sleep:null,exitElapsed:0,restElapsed:0,restOpen:false,bedLatch:false};game.cottageEntry=null;game.cottageEntryKind=null;game.vehicleBoarding=null;game.vehicleBoardingBlocked=null;game.parking=null;game.mainlineSpeech=null;
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
export function cottageBlocked(x,y,game){const layout=interiorLayout(game?.cottage),furniture=game?interiorFurniture(game):COTTAGE_FURNITURE;return x<22||x>layout.width-22||y<76||y>layout.height-20||furniture.some(f=>Math.abs(x-f.x)<f.width/2+10&&Math.abs(y-f.y)<f.height/2+10);}
// 门口、床边判定与室内行走共用正式输入，暂停不累积倒计时或睡眠过渡。
export function updateCottage(game,dt,input){
 if(game.cottage){
  if(game.state!=='playing')return true;
  const room=game.cottage,p=game.player,layout=interiorLayout(room);
  if(room.sleep){room.sleep.elapsed+=dt;if(room.sleep.elapsed>=1.2){finishCottageSleep(game);room.sleep=null;}updateCatMotion(p.bodyAnimation,dt,0,false);return true;}
  // 选择休息时间时不继续走动或推进出口计时，原生弹窗负责圈定操作焦点。
  if(room.restOpen){p.vx=p.vy=0;updateCatMotion(p.bodyAnimation,dt,0,false);return true;}
  const before={x:p.x,y:p.y},length=Math.max(1,Math.hypot(input.x,input.y)),speed=115*movementLoadFactor(game),dx=input.x/length*speed*dt,dy=input.y/length*speed*dt;
  if(!cottageBlocked(p.x+dx,p.y,game))p.x+=dx;if(!cottageBlocked(p.x,p.y+dy,game))p.y+=dy;
  p.vx=(p.x-before.x)/Math.max(dt,.001);p.vy=(p.y-before.y)/Math.max(dt,.001);
  updateCatMotion(p.bodyAnimation,dt,Math.hypot(p.vx,p.vy),true);game.time+=dt;
  // 床边仍主动点击；进入出口范围累计一秒，移开归零，入室出生点不触发。
  room.restElapsed=0;
  room.exitElapsed=!(room.kind==='cottage'&&cottageFloor(room)===1)&&Math.hypot(input.x,input.y)<=.01&&Math.hypot(p.x-layout.exit.x,p.y-layout.exit.y)<=layout.exitRadius?(room.exitElapsed||0)+dt:0;
  if(room.exitElapsed+1e-9>=layout.exitWait)leaveCottage(game);
  return true;
 }
 if(!canEnterCottage(game)||game.progress.restoration?.build||game.mainlineSpeech||game.vehicleBoarding){game.cottageEntry=null;game.cottageEntryKind=null;return false;}
 // 页面暂停不消耗等待时间，关闭后继续；步行和驾驶移动或离开门口立即取消。
 if(game.state!=='playing')return false;
 const layouts=[interiorLayout({kind:'cottage'}),...Object.values(WORKSHOP_INTERIORS)].filter(r=>r.id!=='legendary'||game.progress.vehicleHulls[6]);
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
// 床边主动点击只打开休息选项，仍需选择睡眠目标。
export function openCottageRest(game){
 const room=game.cottage;
 if(!room||cottageFloor(room)!==0||room.kind&&room.kind!=='cottage'||room.sleep||room.restOpen||game.state!=='playing'||Math.hypot(game.player.x-C.bed.x,game.player.y-C.bed.y)>C.bedRadius)return false;
 room.restOpen=true;room.restResult='';game.player.vx=game.player.vy=0;return true;
}
// 出门恢复世界坐标；离开门口后才重新允许站立倒计时。
export function leaveCottage(game){
 if(!game.cottage||game.cottage.sleep||game.state!=='playing'||game.cottage.kind==='cottage'&&cottageFloor(game.cottage)===1)return false;
 const kind=game.cottage.kind||'cottage';Object.assign(game.player,game.cottage.outside,{vx:0,vy:0});game.cottage=null;game.cottageDoorLatch=kind==='cottage'?true:kind;game.onEvent('cottage-change');return true;
}
// 取消只结束当前选择，不推进历法；留在床边时不反复弹出同一选项。
export function cancelCottageRest(game){
 const room=game.cottage;if(!room?.restOpen)return false;
 room.restOpen=false;room.restElapsed=0;room.bedLatch=true;room.notice='想休息时，点击床边的休息按钮。';return true;
}
// 预告和实际休息共用同一目标日期，不修改传入的正式历法。
export function cottageSleepTarget(calendar,mode){
 const target={...calendar};
 advanceLivingCalendar(target,mode==='morning'?LIVING_DAY_MS-calendar.elapsed:calendarView(calendar).remaining);
 return target;
}
// 仅床边明确选择可睡眠，连点不会重复推进，打开休息选项本身不改变日期。
export function sleepInCottage(game,mode){
 if(!game.cottage||cottageFloor(game.cottage)!==0||game.cottage.kind&&game.cottage.kind!=='cottage'||game.cottage.sleep||game.state!=='playing'||!['phase','morning'].includes(mode)||Math.hypot(game.player.x-C.bed.x,game.player.y-C.bed.y)>C.bedRadius)return false;
 game.cottage.exitElapsed=game.cottage.restElapsed=0;game.cottage.restOpen=false;game.cottage.bedLatch=true;
 game.cottage.sleep={mode,elapsed:0,target:cottageSleepTarget(game.progress.living.calendar,mode)};game.cottage.restResult='';game.cottage.notice='好好睡一觉……';return true;
}
// 保存成功才兑现跳时；失败留在屋内，可再次休息，不补领任何战斗或委托奖励。
function finishCottageSleep(game){
 // 点击时锁定预告目标，睡眠过渡中即使自然跨过时段也不会多睡一段。
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

// 只有楼梯前可以切层，楼层互相独立；落脚处预留通道，不改变室外返回位置。
export function changeCottageFloor(game){
 const room=game.cottage;if(!room||room.kind!=='cottage'||room.sleep||room.restOpen||game.state!=='playing'||Math.hypot(game.player.x-COTTAGE_STAIRS.landing.x,game.player.y-COTTAGE_STAIRS.landing.y)>COTTAGE_STAIRS.radius)return false;
 room.floor=1-cottageFloor(room);room.exitElapsed=0;room.restResult='';room.notice=room.floor?'二楼陈列室，可摆放武器架。':'回到一楼生活区。';Object.assign(game.player,COTTAGE_STAIRS.landing,{vx:0,vy:0,pushX:0,pushY:0});game.onEvent('cottage-change');return true;
}
