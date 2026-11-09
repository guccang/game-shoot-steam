// 出入库逐帧验收：所有阶段真实移动，坐标、轮相、身体动作和存档连续。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {requestFireParking,updateFireRescue} from '../src/core/activities/fire-rescue.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {FIRE_GARAGE,FIRE_DOOR,FIRE_PARKING,FIRE_EXIT} from '../src/world/fire-navigation.js';
import {worldDistance} from '../src/world/coordinates.js';
import {fireTransferOpacity} from '../src/core/activities/fire-transit.js';
import {FIRE_TOWN_ARRIVAL} from '../src/world/fire-navigation.js';
// 跑到指定阶段，逐帧检查速度上限，避免用最终落点掩盖瞬移。
function reach(g,phase){let max=0;for(let i=0;i<5000&&g.fireRescue.phase!==phase;i++){const old={x:g.player.x,y:g.player.y};g.update(.05,{x:-1,y:-1});const d=worldDistance(old,g.player);if(d>7.501)assert.equal(fireTransferOpacity(g),1,'换位只能发生在全黑期间');max=Math.max(max,d);}assert.equal(g.fireRescue.phase,phase);return max;}
// 完成火势夹具只用于入库状态分支；完整灭火另由世界消防测试覆盖。
function clearFire(g){for(const f of g.fireRescue.fires){f.hp=0;f.lit=false;}g.enemies=g.enemies.filter(e=>!e.fireEvent);g.update(.05);}
test('接警先黑屏回镇再走到车旁，登车与驶出连续；回站先入库，再下车交接',()=>{
 const g=new Game(freshProgress(),()=>.4);g.start();const from={x:g.player.x,y:g.player.y};g.requestFireRescue();g.startFireRescue();assert.equal(worldDistance(g.player,from),0);assert.equal(g.fireRescue.phase,'transferring');assert.equal(g.vehicle.active,false);const truck=g.fireStationTruck,time=g.fireRescue.remaining;
 assert.equal(g.summonVehicle(),false);assert.equal(g.dismountVehicle(),false);assert.equal(g.dismissFireRescue(),false);assert.equal(g.enterRealm('tower'),false);assert.equal(g.switchMap('jiuzhaigou'),false);
 assert.ok(reach(g,'boarding')>1);assert.ok(worldDistance(g.player,FIRE_DOOR)<1e-6);assert.ok(g.player.bodyAnimation.moveWeight>.8);assert.equal(truck.wheelPhase,0);reach(g,'departing');assert.ok(worldDistance(g.player,FIRE_GARAGE)<1e-6);assert.ok(g.vehicle.active);assert.equal(g.fireStationTruck,null);assert.equal(g.vehicle,truck);
 reach(g,'active');assert.ok(worldDistance(g.player,FIRE_PARKING)<1e-6);assert.notEqual(truck.wheelPhase,0);assert.equal(g.fireRescue.remaining,time);
 clearFire(g);assert.equal(g.fireRescue.phase,'returning');for(let i=0;i<63;i++)g.update(.05);assert.equal(g.fireRescue.phase,'returning');assert.ok(requestFireParking(g));assert.equal(g.fireRescue.phase,'parking');const coins=g.progress.coins;
 reach(g,'exiting');assert.ok(worldDistance(g.player,FIRE_GARAGE)<1e-6);assert.equal(g.vehicle.active,false);assert.equal(g.fireStationTruck,truck);assert.equal(g.progress.coins,coins);const wheel=truck.wheelPhase;
 reach(g,'won');assert.ok(worldDistance(g.player,FIRE_EXIT)<1e-6);assert.equal(truck.wheelPhase,wheel);assert.equal(g.vehicle.active,false);assert.ok(g.fireGarageParked);assert.equal(g.progress.realms.records.fire.clears,1);assert.ok(g.progress.coins>coins);
});
test('回镇和五个动作阶段暂停与刷新保留坐标、轮相、步态、路径和余量，不重复领奖',()=>{
 let g=new Game(freshProgress(),()=>.4);g.start();Object.assign(g.player,FIRE_EXIT);g.requestFireRescue();g.startFireRescue();
 for(const phase of ['transferring','approaching','boarding','departing','parking','exiting']){
  if(phase==='parking'){reach(g,'active');clearFire(g);for(let i=0;i<63;i++)g.update(.05);assert.equal(g.fireRescue.phase,'returning');assert.ok(requestFireParking(g));}
  else reach(g,phase);
  for(let i=0;i<6;i++)g.update(.05);const old={x:g.player.x,y:g.player.y},wheel=g.vehicle.wheelPhase,body={...g.player.bodyAnimation};g.pause();const motion=JSON.stringify(g.fireRescue.transit);g.update(20);assert.equal(JSON.stringify(g.fireRescue.transit),motion);assert.equal(worldDistance(g.player,old),0);assert.deepEqual(g.player.bodyAnimation,body);
  g.syncFireRescue();g=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);assert.equal(g.state,'paused');assert.equal(g.fireRescue.phase,phase);assert.ok(worldDistance(g.player,old)<1e-6);assert.equal(g.vehicle.wheelPhase,wheel);assert.deepEqual(g.player.bodyAnimation,body);assert.equal(JSON.stringify(g.fireRescue.transit),motion);g.start();
 }
 reach(g,'won');const paid=g.progress.coins;g.syncFireRescue();g=new Game(g.progress);g.start();for(let i=0;i<30;i++)updateFireRescue(g,.05);assert.equal(g.progress.coins,paid);assert.equal(g.progress.realms.records.fire.clears,1);assert.ok(g.fireGarageParked);
});
// 站后接警沿路网绕建筑到站前，不能从后墙穿过库内消防车。
test('接警步行路线避开消防站后墙与停驻车体',()=>{
 const g=new Game(freshProgress(),()=>.4);g.start();g.requestFireRescue();g.startFireRescue();
 reach(g,'approaching');for(const p of g.fireRescue.transit.path.slice(0,-3))assert.ok(p.x<1280||p.x>1510||p.y<950||p.y>1120,`路径穿过站房 ${JSON.stringify(p)}`);
 reach(g,'boarding');assert.ok(worldDistance(g.player,FIRE_DOOR)<1e-6);
});

// 真实森林中旧版会卡住的贴树位置，回镇无需再搜索林中的起步路线。
const TREE_SIDE={x:2242.903006543718,y:439.83505954865404};
test('贴树接警全黑后才回镇，恢复画面后沿真实道路走到消防车',()=>{
 const g=new Game(freshProgress(),()=>.4);g.start();Object.assign(g.player,TREE_SIDE);g.player.livingCollision=true;
 g.requestFireRescue();g.startFireRescue();const remaining=g.fireRescue.remaining;
 assert.equal(worldDistance(g.player,TREE_SIDE),0);assert.equal(fireTransferOpacity(g),0);
 for(let i=0;i<6;i++)g.update(.05);assert.equal(worldDistance(g.player,TREE_SIDE),0);assert.equal(fireTransferOpacity(g),1);
 for(let i=0;i<3;i++)g.update(.05);assert.ok(worldDistance(g.player,FIRE_TOWN_ARRIVAL)<1e-6);assert.equal(fireTransferOpacity(g),1);
 reach(g,'approaching');assert.equal(fireTransferOpacity(g),0);assert.ok(worldDistance(g.player,FIRE_TOWN_ARRIVAL)<1e-6);
 assert.equal(g.player.livingCollision,false);reach(g,'active');assert.equal(g.fireRescue.remaining,remaining);
 assert.ok(worldDistance(g.player,FIRE_PARKING)<1e-6);
});

test('黑屏换位前后刷新保留进度，旧卡树存档自动采用回镇流程',()=>{
 let g=new Game(freshProgress(),()=>.4);g.start();Object.assign(g.player,TREE_SIDE);g.requestFireRescue();g.startFireRescue();
 for(const frames of [3,6,5]){
  for(let i=0;i<frames;i++)g.update(.05);g.pause();g.syncFireRescue();
  const position={x:g.player.x,y:g.player.y},motion=JSON.stringify(g.fireRescue.transit),opacity=fireTransferOpacity(g);
  g.update(20);assert.equal(JSON.stringify(g.fireRescue.transit),motion);
  g=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);
  assert.ok(worldDistance(g.player,position)<1e-6);assert.equal(JSON.stringify(g.fireRescue.transit),motion);assert.equal(fireTransferOpacity(g),opacity);g.start();
 }
 reach(g,'approaching');g.syncFireRescue();const raw=JSON.parse(JSON.stringify(g.progress));
 delete raw.fireDispatch.run.townApproach;raw.fireDispatch.run.position=TREE_SIDE;
 raw.fireDispatch.run.transit.path.unshift({x:2240,y:400});raw.fireDispatch.run.transit.step=0;
 g=new Game(validateProgress(raw),()=>.4);assert.equal(g.fireRescue.phase,'transferring');assert.ok(worldDistance(g.player,TREE_SIDE)<1e-6);
 g.start();reach(g,'active');assert.ok(worldDistance(g.player,FIRE_PARKING)<1e-6);
});
