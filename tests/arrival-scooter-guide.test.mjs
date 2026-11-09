// 入职上下车引导专项：使用真实赠车、伐木、靠近自动修复和工坊交易验证任务顺序。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {RESTORATION_FLIGHT,facilityOpen} from '../src/config/town-restoration.js';
import {skipArrivalJourney,completeArrivalLetter,arrivalTarget,workshopBuildView} from '../src/core/camp/ranger-arrival.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {arrivalWorkshopGuide} from '../src/ui/arrival-workshop-guide.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {CAMP_WAREHOUSE} from '../src/config/wood-storage.js';
import {storeWood} from '../src/core/inventory/wood-storage.js';
import {woodPickupCapacity} from '../src/core/inventory/wood-pickup.js';
import {TREE_REWARD} from '../src/config/rewards.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';

// 原定赠品从正式短剧跳过入口交付，来信仍需明确确认。
function ready(wood=0){const g=new Game(freshRangerProgress(),()=>.5);g.start();assert.ok(skipArrivalJourney(g));g.progress.wood=wood;assert.ok(completeArrivalLetter(g));return g;}
// 走到实际北广场赠车附近，上车和进度判断使用生产入口。
function board(g){Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.ok(g.summonVehicle());g.update(.05);}
// 固定帧长推进，避免绕过正式施工时长。
function tick(g,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)g.update(.05);}
// 只把测试人物移到活树旁，木料由正式电锯命中结算。
function gather(g){
 g.livingPersist=()=>true;
 for(let n=0;n<40&&g.progress.arrival.phase==='gather';n++){
  const tree=g.trees.find(t=>t.hp>0);Object.assign(g.player,{x:tree.x-50,y:tree.y});g.player.angle=0;
  for(let i=0;i<120&&tree.hp>0&&g.progress.arrival.phase==='gather';i++)g.update(.05);
  if(woodPickupCapacity(g)<TREE_REWARD.wood){Object.assign(g.player,CAMP_WAREHOUSE);assert.ok(storeWood(g).ok);}
 }
 assert.equal(g.progress.arrival.phase,'repair');
}

test('来信后先上车，材料足够也不能跳过；上车后按余额跳过重复采集',()=>{
 for(const wood of [0,RANGER.repairWood]){
  const g=ready(wood);assert.equal(g.progress.arrival.phase,'ride-guide');assert.equal(g.arrivalCinematic,false);
  const target=arrivalTarget(g);assert.equal(target.x,RANGER.parking.x);assert.ok(target.y>RANGER.parking.y);
  assert.equal(worldNavigationObjective(g).task.id,'arrival-scooter');
  Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.equal(g.advanceArrival(),false);g.update(.05);
  assert.equal(g.progress.arrival.phase,'ride-guide');assert.equal(g.progress.wood,wood);
  board(g);assert.equal(g.progress.arrival.phase,wood?'repair':'gather');assert.equal(g.vehicle.active,true);assert.equal(g.progress.wood,wood);
 }
});

test('骑赠车采木修房，施工及购枪刷新保持骑乘，修好直接购买',()=>{
 let g=ready();board(g);gather(g);const wood=g.progress.wood;g.attackTimer=999; // 收料后冻结额外攻击，单独核验修复与购买账本。
 Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});g.update(.05);
 assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,wood-RANGER.repairWood);
 g.progress.patrol=capturePatrol(g);assert.equal(g.progress.patrol.mountedVehicleIndex,RANGER.giftHull);
 g=new Game(validateProgress(structuredClone(g.progress)),()=>.5);g.start();g.attackTimer=999;assert.equal(g.vehicle.active,true);
 tick(g,RANGER.rebuildSeconds+RESTORATION_FLIGHT+.2);
 assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.vehicle.active,true);assert.equal(g.arrivalCinematic,false);
 assert.equal(facilityOpen(g.progress,'weapons'),true);assert.equal(workshopBuildView(g).state,'ready');
 assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:0,action:'buy'}).ok,true);
 // 先在修复区侧面查看室外引导，避开门口自动进屋的触发范围。
 g.player.x=WORKSHOP.x+110;tick(g,RANGER.rebuildRevealSeconds);assert.equal(arrivalWorkshopGuide(g).source,'.world-workshop-entry[data-workshop-kind="weapons"]');
 g.progress.patrol=capturePatrol(g);g=new Game(structuredClone(g.progress),()=>.5);g.start();g.attackTimer=999;g.update(.05);
 assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.vehicle.active,true);
 assert.equal(commitWorkshop(g,{kind:'weapons',index:0,action:'buy'},()=>true).ok,true);
 assert.equal(g.progress.arrival.phase,'complete');assert.equal(g.progress.weapons[0],1);assert.equal(g.progress.wood,wood-RANGER.repairWood);assert.equal(g.vehicle.active,true);
});

test('引导指向任务路线，车旁提示正面站定上车，骑车修复不提前要求下车',()=>{
 const g=ready();Object.assign(g.player,{x:1200,y:700});assert.equal(arrivalWorkshopGuide(g).source,'#arrival-goal');
 Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.equal(arrivalWorkshopGuide(g).source,'#arrival-goal');assert.match(arrivalWorkshopGuide(g).text,/靠近木制自行车/);
 assert.equal(arrivalWorkshopGuide(g,'settings-dialog'),null);g.progress.wood=RANGER.repairWood;board(g);
 Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.equal(arrivalWorkshopGuide(g),null);
});

test('上车阶段保存失败可重试',()=>{
 const g=ready();g.arrivalPersist=()=>false;board(g);assert.equal(g.progress.arrival.phase,'ride-guide');assert.equal(g.arrivalError,true);
 g.arrivalPersist=()=>true;assert.ok(g.advanceArrival());g.update(.05);assert.equal(g.progress.arrival.phase,'gather');

});
