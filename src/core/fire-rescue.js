import {vehicleService} from './vehicle-repair.js';
import {isRainWeather} from '../world/season-weather.js';
import {facilityOpen} from '../config/town-restoration.js';
import {awardCampXp} from '../progression/camp-level.js';
import { creditResource } from '../progression/resource-wallet.js';
import {recordActivity} from '../progression/game-statistics.js';
import {enemyMass} from '../config/enemy-mass.js';
import {rewardReceipt} from '../progression/reward-receipt.js';
import {storeCarriedVehicle} from './camp-parking.js';
import {clampRiderSupply} from '../combat/rider-supply.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { i18nText } from "../i18n/index.js";
// 世界火警生命周期：使用原森林对象、真实路网和独立借车，不创建秘境或复制战场。
import {FIRE_RESCUE as C,fireEquipment} from '../config/fire-rescue.js';
import {FIRE_PARKING,FIRE_EXIT,FIRE_GARAGE,FIRE_DOOR,FIRE_APRON,FIRE_DOOR_APPROACH,fireRoads,fireTreeSites,fireWaterSources,fireRoute} from '../world/fire-navigation.js';
import {worldDistance,canonical,nearest} from '../world/coordinates.js';
import {beginFireTransit,advanceFireTransit,beginFireTownTransfer} from './fire-transit.js';
import {createVehicle,summonVehicle,dismountVehicle} from '../combat/vehicle.js';
import {validateFireProgress} from '../progression/fire-progress.js';
// 每次火情使用真实树的坐标作为存档标识，不依赖会随敌人变化的实体编号。
function attachTrees(game,r){
 for(const f of r.fires){f.tree=game.trees.find(t=>Math.hypot(t.x-f.x,t.y-f.y)<1);if(!f.tree)throw Error(i18nText("core.fire-rescue.f53492687d"));f.tree.fireRescue=f;}
}
// 记录后再发出事件，使所有按钮、随机调度和结算走同一个保存入口。
function changed(game,text,sound=null){syncFireRescue(game);game.onEvent('fire-change',{text,sound});}
// 已拥有的库内消防车可从附近快捷上车；接警过场、室内和远程召车仍禁止。
export function canBoardFireGarage(game){
 return game.fireGarageParked&&game.mapId==='forest'&&!game.cottage&&!game.arrivalCinematic&&!game.fireActive&&!game.campDefense&&!game.workshopTrial&&['playing','paused'].includes(game.state)&&!game.vehicle.active&&game.vehicle.index===C.vehicle&&game.progress.vehicleHulls[C.vehicle]>0&&game.vehicle.cooldown<=0&&worldDistance(game.player,FIRE_GARAGE)<=155;
}
// 上车沿用同一车体和耐久，清掉已结算的旧检查点，避免刷新再次恢复为入库状态。
export function boardFireGarage(game){
 if(!canBoardFireGarage(game)||!summonVehicle(game))return false;
 Object.assign(game.player,nearest(FIRE_GARAGE,game.player),{vx:0,vy:0,pushX:0,pushY:0});
 game.progress.fireDispatch.garage=null;
 if(game.fireRescue?.phase==='won'){clearFireMarkers(game);game.fireRescue=null;}
 syncFireRescue(game);game.onEvent('camp-parking-change');return true;
}
// 读取无活动检查点的等待时间，活动检查点保留水量、火势、位置和剩余怪物。
export function restoreFireRescue(game){
 game.fireClock=game.progress.fireDispatch.next;
 const garage=game.progress.fireDispatch.garage;if(garage?.parked&&game.progress.vehicleHulls[4]&&!game.realm&&!game.story){game.vehicles[4].hp=game.vehicles[4].maxHp*garage.truckHp;game.vehicles[4].active=false;}
 if(game.mapId==='forest'&&!game.realm&&!game.story)game.fireWaters=fireWaterSources(game);const saved=game.progress.fireDispatch.run;
 if(!saved||game.mapId!=='forest'||game.realm||game.story)return;
 const r=game.fireRescue={...saved,fires:saved.fires.map(f=>({...f})),stream:null,route:[],routeClock:0,waters:fireWaterSources(game)};
 if(r.fires.some(f=>!game.trees.some(t=>Math.hypot(t.x-f.x,t.y-f.y)<1))){game.fireRescue=null;game.progress.fireDispatch.run=null;return;}
 attachTrees(game,r);
 if(game.fireActive){
  borrowTruck(game,r);Object.assign(game.player,r.position||FIRE_PARKING,{vx:0,vy:0});game.vehicle.hp=game.vehicle.maxHp*r.truckHp;game.vehicle.cooldown=r.truckCooldown;game.vehicle.active=r.driving&&game.vehicle.hp>0;game.vehicle.wheelPhase=r.wheelPhase;game.vehicle.angle=r.truckAngle;if(r.bodyMotion)Object.assign(game.player.bodyAnimation,r.bodyMotion);
  if(game.fireTransit)r.route=r.transit.path.slice(r.transit.step);
  for(const e of saved.enemies)spawnEmber(game,e,e.hp);game.state=game.player.hp>0?'paused':'dead';
 }else if(r.phase==='won'){
  // 已交接后保持步行，车库状态独立恢复，不再让旧驾驶检查点重新上车。
  Object.assign(game.player,r.position||FIRE_PARKING,{vx:0,vy:0});game.vehicle.active=false;
  game.state=game.player.hp>0?'paused':'dead';
 }
}
// 首次借车不触碰其他车型；车库再次出车复用原车体、耐久和挂载。
function borrowTruck(game,r){
 r.equipment=fireEquipment(game.progress);r.previousVehicle=game.vehicle;r.previousTruck=game.vehicles[4];game.vehicle.active=false;
 r.loan=game.progress.vehicleHulls[4]?game.vehicles[4]:createVehicle(r.equipment, 4);game.vehicles[4]=game.vehicle=r.loan;
 // 任务借车也结束电动车骑乘，不能把扩容余弹带到消防车上。
 if(r.previousVehicle.index===5)clampRiderSupply(game);
 game.progress.fireDispatch.garage=null;
 game.player.flying=false;game.player.amphibious=false;game.player.treePass=false;delete game.player.arena;
 // 过场在普通玩家更新之前返回，立即同步消防阶段的设施碰撞。
 game.player.livingCollision=false;
}
// 两片随机林区各三棵起火树和一棵邻树，优先处理整片可阻止该片继续蔓延。
export function requestFireRescue(game,source='manual'){
 if(!facilityOpen(game.progress,'fire'))return false;
 if(game.campDefense||game.realm||game.story||game.boss||game.mapId!=='forest'||game.state==='dead')return false;
 if(game.fireRescue?.phase==='offered'||game.fireActive)return true;
 clearFireMarkers(game);game.fireWaters=fireWaterSources(game);const sites=fireTreeSites(game),fires=[],used=new Set();
 if(sites.length<GAMEPLAY_VALUES.fire.minTrees)return unavailableFire(game,source);
 const seed=sites[Math.min(sites.length-1,Math.floor(game.random()*sites.length))];
 for(let group=0;group<GAMEPLAY_VALUES.fire.groupCount;group++){
  const pool=sites.filter(s=>!used.has(s.tree)&&(group===0||worldDistance(s.tree,seed.tree)>GAMEPLAY_VALUES.fire.groupDistance));
  if(pool.length<GAMEPLAY_VALUES.fire.treesPerGroup)return unavailableFire(game,source);
  const center=group?pool[Math.min(pool.length-1,Math.floor(game.random()*pool.length))]:seed;
  const chosen=pool.sort((a,b)=>worldDistance(a.tree,center.tree)-worldDistance(b.tree,center.tree)).slice(0,GAMEPLAY_VALUES.fire.treesPerGroup);
  chosen.forEach((s,i)=>{used.add(s.tree);fires.push({x:s.tree.x,y:s.tree.y,stop:s.stop,group,hp:C.fireHp,lit:i<GAMEPLAY_VALUES.fire.initialLitPerGroup,ever:i<GAMEPLAY_VALUES.fire.initialLitPerGroup});});
 }
 game.fireRescue={phase:'offered',source,offerRemaining:C.offerSeconds,fires,water:C.initialWater,remaining:C.duration,spread:C.spreadInterval,kills:0,refills:0,waterGuide:false,groupsAwake:[],stream:null,route:[],routeClock:0,waters:fireWaterSources(game)};
 attachTrees(game,game.fireRescue);changed(game,source==='random'?i18nText("core.fire-rescue.afe44d0521"):i18nText("core.fire-rescue.bc88a1cecd"),'fire-alert');return true;
}
// 林木被采伐后正常推迟火警，不制造假树或中断巡逻帧。
function unavailableFire(game,source){game.fireClock=C.cooldown;game.fireRescue=null;changed(game,source==='manual'?i18nText("core.fire-rescue.3a8c1618da"):'');return false;}
// 接受后在世界消防站领取任务车，地图、树木、敌人和巡游进度仍为原对象。
export function startFireRescue(game){
 const r=game.fireRescue;if(r?.phase!=='offered'||game.realm||game.story||game.mapId!=='forest'||game.boss)return false;
 // 自有消防车报废或在修时不能用任务借车覆盖永久订单。
 if(game.progress.vehicleHulls[4]&&(game.vehicles[4].hp<=0||vehicleService(game,4)?.phase)){game.onEvent('story-hint',{text:'消防车需要先在维修中心修好并取回，才能再次出动。'});return false;}
 if(game.vehicle.active&&!game.dismountVehicle())return false;
 if(game.cottage){Object.assign(game.player,game.cottage.outside,{vx:0,vy:0});game.cottage=null;game.cottageDoorLatch='fire';}
 borrowTruck(game,r);game.state='playing';beginFireTownTransfer(game);
 recordActivity(game.progress,'fire');changed(game,fireMotionText('transferring'));return true;
}
// 独立火苗怪采用原敌人AI和动作，击杀不占用森林波次数额。
function spawnEmber(game,spot,hp=GAMEPLAY_VALUES.fire.emberHealth){
 const e=game.spawnEnemy(0,0,spot,{ambient:true});Object.assign(e,{fireEvent:true,ember:true,species:'slime',flying:false,rank:0,level:0,tough:false,hp,maxHp:GAMEPLAY_VALUES.fire.emberHealth,damage:GAMEPLAY_VALUES.fire.emberDamage,speed:GAMEPLAY_VALUES.fire.emberSpeed,radius:GAMEPLAY_VALUES.fire.emberRadius,mass:enemyMass(),name:i18nText("core.fire-rescue.6243c2f84f")});return e;
}
// 未接受的告警和已完成的事件可关闭；撤退归还借车，但不把人传回另一个场景。
export function dismissFireRescue(game,{silent=false}={}){
 const r=game.fireRescue;if(!r||r.phase==='returning'||game.fireTransit)return false;
 if(r.phase==='active')finishFireRescue(game,false,i18nText("core.fire-rescue.f546f0a372"));
 clearFireMarkers(game);game.fireRescue=null;game.fireClock=C.cooldown+game.random()*(C.randomMax-C.randomMin);changed(game,silent?'':i18nText("core.fire-rescue.905eb61b0b"));return true;
}
// 清理只撤掉叠加标记，不删除或重建被救的树。
function clearFireMarkers(game){for(const t of game.trees)delete t.fireRescue;}
// 回站完成时一次入账、猫猫下车，车体独立停回车库；失败仍归还临时车。
function finishFireRescue(game,won,message){
 const r=game.fireRescue;if(!game.fireActive)return;
 r.phase=won?'won':'lost';r.stream=null;r.route=[];r.message=message;game.fireClock=C.cooldown+game.random()*(C.randomMax-C.randomMin);
 for(const f of r.fires)f.lit=false;
 game.enemies=game.enemies.filter(e=>!e.fireEvent);
 const p=game.progress,before=structuredClone(p),first=won&&!p.vehicleHulls[4];
 if(won){awardCampXp(p,'fire');const record=p.realms.records.fire;record.best=1;record.clears++;creditResource(p,'coins',GAMEPLAY_VALUES.fire.rewardBase+r.fires.filter(f=>f.ever&&f.hp<=0).length*GAMEPLAY_VALUES.fire.rewardPerTree);
  if(first){p.vehicleHulls[4]=1;p.vehicleLoadouts[4]=null;}
 }
 if(won){if(r.previousVehicle.index!==4)storeCarriedVehicle(game,r.previousVehicle);p.vehicleIndex=4;game.vehicle=game.vehicles[4]=r.loan;
  p.fireDispatch.garage={parked:true,truckHp:r.loan.hp/r.loan.maxHp};
 }
 else{game.vehicles[4]=r.previousTruck;game.vehicle=r.previousVehicle;game.vehicle.active=false;}
 game.player.flying=false;game.player.amphibious=false;game.player.treePass=false;delete r.equipment;
 changed(game,won?i18nText("core.fire-rescue.408020e16e"):message,won?'fire-park':null);
 if(won)game.onEvent('task-reward',rewardReceipt(before,p,'森林消防'));
}
// 保存世界位置、单棵树火量、取水次数与怪物生命；不序列化原森林或临时装备。
export function syncFireRescue(game){
 const r=game.fireRescue;game.progress.fireDispatch={garage:game.progress.fireDispatch.garage?.parked?{parked:true,truckHp:game.fireGarageParked?game.vehicles[4].hp/game.vehicles[4].maxHp:game.progress.fireDispatch.garage.truckHp}:null,next:game.fireClock??C.randomMin,run:r?validateFireProgress({run:{...r,position:canonical(game.player),truckHp:game.vehicle.index===4?game.vehicle.hp/game.vehicle.maxHp:1,truckCooldown:game.vehicle.cooldown,wheelPhase:game.vehicles[4].wheelPhase,truckAngle:game.vehicles[4].angle,bodyMotion:game.player.bodyAnimation,driving:game.vehicle.active,enemies:game.enemies.filter(e=>e.fireEvent&&e.hp>0).map(e=>({...canonical(e),hp:e.hp})),fires:r.fires.map(({tree,...f})=>f)}}).run:null};
}
// 玩家可随时切换取水指引，低水量自动转向最近的真实河岸设施。
export function guideFireWater(game){if(game.fireRescue?.phase!=='active')return false;const r=game.fireRescue;r.waterGuide=!r.waterGuide;r.routeClock=0;changed(game,r.waterGuide?i18nText("core.fire-rescue.f90e712b7c"):i18nText("core.fire-rescue.087f4a2c4a"));return true;}
// 原树的火势与最近取水点供界面和正式绘制器共享。
export function fireObjective(game){
 const r=game.fireRescue;if(!r)return null;
 if(game.fireTransit){const point=r.transit.path[r.transit.step]||game.player;return {transit:true,target:point,point,name:fireMotionText(r.phase),left:0,out:0};}
 if(r.phase==='returning')return {returning:true,water:false,target:FIRE_PARKING,point:FIRE_PARKING,name:i18nText("core.fire-rescue.54425cc58e"),left:0,out:r.fires.filter(f=>f.ever&&f.hp<=0).length};
 const fires=r.fires.filter(f=>f.lit&&f.hp>0),enemies=game.enemies.filter(e=>e.fireEvent&&e.hp>0);
 const nearestToPlayer=items=>[...items].sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player))[0];
 const water=r.waterGuide||r.water<GAMEPLAY_VALUES.fire.lowWater,target=water?nearestToPlayer(r.waters):nearestToPlayer(fires)||nearestToPlayer(enemies);
 return {water,target,point:target?.stop||target,name:water?i18nText("core.fire-rescue.d02a8281f3"):fires.length?i18nText("core.fire-rescue.5027b9c4c2"):i18nText("core.fire-rescue.4cbd9821ba"),left:fires.length,out:r.fires.filter(f=>f.ever&&f.hp<=0).length};
}
// 随机火警只在可见巡逻时调度；活动救援同样遵守暂停，不补算离线时间。
export function updateFireRescue(game,dt,input={x:0,y:0}){
 if(game.state==='dead'&&game.fireActive){finishFireRescue(game,false,i18nText("core.fire-rescue.d6b210a3af"));return;}
 if(game.state!=='playing'||game.realm||game.story||game.mapId!=='forest')return;
 let r=game.fireRescue;
 const raining=isRainWeather(game.livingWeather);
 if(!r){if(raining)return;if(!game.boss){game.fireClock=(game.fireClock??C.randomMin)-dt;if(game.fireClock<=0)requestFireRescue(game,'random');}return;}
 // 雨水逐帧削弱所有火点，出车途中也生效；未接警只解除告警，不发任务奖励。
 if(raining&&dt>0&&!r.rainExtinguished&&['offered','active','transferring','approaching','boarding','departing'].includes(r.phase)){
  for(const f of r.fires)if(f.lit&&f.hp>0){f.hp=Math.max(0,f.hp-C.rainExtinguish*dt);if(f.hp<=1e-8){f.hp=0;f.lit=false;}}
  if(!r.fires.some(f=>f.lit&&f.hp>0)){
   if(r.phase==='offered'){dismissFireRescue(game,{silent:true});game.onEvent('fire-change',{text:'雨水已扑灭火情，火警解除。'});return;}
   r.rainExtinguished=true;r.stream=null;game.enemies=game.enemies.filter(e=>!e.fireEvent);
   changed(game,'雨水已扑灭火情，请驾驶消防车返站交接。');
  }
 }
 // 自然灭火与水炮灭火共用原地驾驶返站，保留车体、位置和耐久，到站入库后才发奖。
 if(r.rainExtinguished&&r.phase==='active'){beginFireReturn(game);return;}
 // 邀请只在正常巡游时消耗十秒；查看详情沿游戏暂停冻结，已接警阶段不受影响。
 if(r.phase==='offered'){
  r.offerRemaining=Math.max(0,(r.offerRemaining??C.offerSeconds)-dt);
  if(r.offerRemaining<=1e-9)dismissFireRescue(game,{silent:true});
  return;
 }
 if(game.fireTransit){if(advanceFireTransit(game,dt))nextFireTransit(game);return;}
 if(r.phase==='returning'){updateFireReturn(game,dt,input);return;}
 if(r.phase!=='active')return;r.stream=null;
 r.remaining=Math.max(0,r.remaining-dt);if(!r.remaining){finishFireRescue(game,false,i18nText("core.fire-rescue.3cd782bd48"));return;}
 const burning=r.fires.filter(f=>f.lit&&f.hp>0);
 if(!burning.length&&!game.enemies.some(e=>e.fireEvent&&e.hp>0)){beginFireReturn(game);return;}
 if(!raining)r.spread-=dt;if(!raining&&r.spread<=0){r.spread=C.spreadInterval;for(let group=0;group<GAMEPLAY_VALUES.fire.groupCount;group++)if(burning.some(f=>f.group===group)){const next=r.fires.find(f=>f.group===group&&!f.ever);if(next){next.ever=next.lit=true;changed(game,i18nText("core.fire-rescue.3e263ee644"));}}}
 const source=r.waters.find(s=>worldDistance(s,game.player)<GAMEPLAY_VALUES.fire.refillDistance),driving=game.vehicle.active&&game.vehicle.index===4;
 if(source&&driving){if(!r.filling&&r.water<C.water-1){r.refills++;r.filling=true;}r.water=Math.min(C.water,r.water+C.refill*dt);if(r.water>=C.water-.01){r.waterGuide=false;r.filling=false;}}
 else r.filling=false;
 if(r.water<GAMEPLAY_VALUES.fire.lowWater&&!r.waterGuide){r.waterGuide=true;r.routeClock=0;changed(game,i18nText("core.fire-rescue.43f5008237"));}
 for(const f of burning)if(worldDistance(f,game.player)<GAMEPLAY_VALUES.fire.burnDistance)game.hurt(C.fireDamage,f);
 const target=burning.filter(f=>worldDistance(f,game.player)<C.range).sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player))[0]||game.enemies.find(e=>e.fireEvent&&e.hp>0&&worldDistance(e,game.player)<C.range);
 if(driving&&r.water>0&&target&&!source){
  const active=Math.min(dt,r.water/C.waterUse);r.water-=C.waterUse*active;const near=nearest(target,game.player);r.stream={x:game.player.x-35,y:game.player.y-26,tx:near.x,ty:near.y-(target.stop?55:12)};
  if(target.stop){if(!r.groupsAwake.includes(target.group)){r.groupsAwake.push(target.group);spawnEmber(game,target.stop);const second=fireRoads(game).nodes.find(n=>worldDistance(n,target.stop)>GAMEPLAY_VALUES.fire.emberMinOffset&&worldDistance(n,target.stop)<GAMEPLAY_VALUES.fire.emberMaxOffset);spawnEmber(game,second||target.stop);}
   target.hp=Math.max(0,target.hp-C.extinguish*active);if(!target.hp){target.lit=false;r.routeClock=0;}
  }else game.hit(target,C.monsterWaterDamage*active,false,{water:true,statisticsSource:{vehicle:'fire-truck'}});
 }
 r.routeClock-=dt;if(r.routeClock<=0){const objective=fireObjective(game);r.route=objective?.point?fireRoute(game,objective.point):[];r.routeClock=GAMEPLAY_VALUES.fire.routeRefreshSeconds;}
}

// 灭火成功先收水带返站，保留同一车辆和世界位置；此时尚未结算任何奖励。
function beginFireReturn(game){
 const r=game.fireRescue;r.phase='returning';r.stream=null;r.filling=false;r.waterGuide=false;r.dockTime=0;r.routeClock=0;r.route=fireRoute(game,FIRE_PARKING);
 changed(game,i18nText("core.fire-rescue.d128a40403"));
}
// 返站只维护路线，入库必须由点击发起。
function updateFireReturn(game,dt,input){
 const r=game.fireRescue;r.stream=null;r.filling=false;r.dockTime=0;
 r.routeClock-=dt;if(r.routeClock<=0){r.route=fireRoute(game,FIRE_PARKING);r.routeClock=GAMEPLAY_VALUES.fire.routeRefreshSeconds;}
}

// 只有走完当前连续路径才进入下一阶段；内部上下车绕过按钮锁，不改世界坐标。
function nextFireTransit(game){
 const r=game.fireRescue;
 if(r.phase==='transferring')beginFireTransit(game,'approaching',[...fireRoute(game,FIRE_APRON,true),FIRE_APRON,FIRE_DOOR_APPROACH,FIRE_DOOR]);
 else if(r.phase==='approaching')beginFireTransit(game,'boarding',[FIRE_GARAGE],GAMEPLAY_VALUES.fire.boardSeconds);
 else if(r.phase==='boarding'){summonVehicle(game);beginFireTransit(game,'departing',[FIRE_APRON,FIRE_PARKING],GAMEPLAY_VALUES.fire.departSeconds);}
 else if(r.phase==='departing'){r.phase='active';delete r.transit;r.route=[];r.routeClock=0;game.player.vx=game.player.vy=0;changed(game,i18nText('core.fire-rescue.79fcb15f32'));return;}
 else if(r.phase==='parking'){dismountVehicle(game);beginFireTransit(game,'exiting',[FIRE_DOOR,FIRE_DOOR_APPROACH,FIRE_APRON,FIRE_EXIT],GAMEPLAY_VALUES.fire.exitSeconds);}
 else if(r.phase==='exiting'){delete r.transit;finishFireRescue(game,true);return;}
 changed(game,fireMotionText(r.phase));
}

// 阶段文案共用一个入口，回镇使用当前开发阶段的中文提示。
export function fireMotionText(phase){
 switch(phase){
  case 'transferring':return '返回小镇 · 准备前往消防站';
  case 'approaching':return i18nText('fire.motion.approaching');
  case 'boarding':return i18nText('fire.motion.boarding');
  case 'departing':return i18nText('fire.motion.departing');
  case 'parking':return i18nText('fire.motion.parking');
  case 'exiting':return i18nText('fire.motion.exiting');
  default:return '';
 }
}

// 返站按钮与实际执行共用车辆、距离和阶段验证，连点不会重复结算。
export function canRequestFireParking(game){
 return game.state==='playing'&&game.fireRescue?.phase==='returning'&&game.vehicle.active&&game.vehicle.index===C.vehicle&&worldDistance(game.player,FIRE_PARKING)<=C.dockRadius;
}
// 玩家明确点击后才接管车辆，后续倒车和步行出站沿用原连续动画。
export function requestFireParking(game){
 if(!canRequestFireParking(game))return false;
 beginFireTransit(game,'parking',[FIRE_APRON,FIRE_GARAGE]);changed(game,i18nText('fire.motion.parking'));return true;
}
