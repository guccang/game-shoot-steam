// 乘坐状态回归：覆盖正式巡游读档、首页延后建图、主动下车与活动隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, freshProgress, validateProgress} from '../src/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {validatePatrol} from '../src/progression/battle/patrol-progress.js';
import {COLLECTED_VEHICLES, vehicleModel} from '../src/config/vehicles.js';
import {createGameEventHandler} from '../src/app/game-events.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {skipArrivalJourney} from '../src/core/camp/ranger-arrival.js';
import {parkedOwned} from '../src/core/vehicles/camp-parking.js';
import {absorbVehicleHit} from '../src/combat/vehicle.js';
import {syncRealm} from '../src/core/realms/realm-manager.js';

// 以已拥有的当前车型开始正式巡游，其他车辆仍留在停车场。
function mounted(index=5) {
  const p=freshProgress();p.vehicleHulls.fill(1);p.vehicleIndex=index;
  p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
  const g=new Game(p,()=>.5);g.start();assert.equal(g.summonVehicle(),true);return g;
}
// 存档必须经过 JSON 和正式白名单，再走与首页相同的延后建图入口。
function reload(g,deferWorld=false) {
  g.progress.patrol=capturePatrol(g);
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5,()=>{},{deferWorld});
  if(deferWorld){assert.equal(restored.vehicle.active,false);restored.initializeWorld();}
  return restored;
}

test('全部车型在直接加载与首页建图后仍处于乘坐状态，飞行、两栖和穿树标志一致',()=>{
  for(let index=0;index<COLLECTED_VEHICLES.length;index++)for(const deferred of [false,true]){
    const g=mounted(index),restored=reload(g,deferred);
    restored.start();assert.equal(restored.vehicle.index,index);assert.equal(restored.vehicle.active,true);
    assert.equal(restored.player.flying,!!vehicleModel(index).flying);
    assert.equal(restored.player.amphibious,!!vehicleModel(index).amphibious);
    assert.equal(restored.player.treePass,!!vehicleModel(index).treePass);
    assert.equal(restored.vehicles.filter(v=>v.active).length,1);
    assert.equal(parkedOwned(restored).some(s=>s.record.hull===index),false);
  }
});

test('主动下车、载具损毁、角色死亡与全新巡游都保持步行',()=>{
  const g=mounted();assert.equal(g.dismountVehicle(),true);assert.equal(reload(g).vehicle.active,false);
  assert.equal(g.summonVehicle(),true);absorbVehicleHit(g,1e9);assert.equal(reload(g).vehicle.active,false);
  const dead=mounted();dead.state='dead';dead.player.hp=0;
  const restored=reload(dead);assert.equal(restored.state,'dead');assert.equal(restored.vehicle.active,false);
  assert.equal(new Game(freshProgress()).vehicle.active,false);
});

test('存档不允许无效车型、未拥有车型、已停车车辆或旧选择自动上车',()=>{
  const g=mounted(),snapshot=capturePatrol(g);
  for(const index of [-1,1.5,99,'5',null])assert.equal(validatePatrol({...snapshot,mountedVehicleIndex:index}).mountedVehicleIndex,null);
  for(const change of [p=>{p.vehicleHulls[5]=0;},p=>{p.vehicleIndex=0;},p=>{p.campParking.owned=p.campParking.owned.filter(s=>s.spot!=='north-0-0');p.campParking.owned.push({hull:5,spot:'north-0-0',hp:1});}]){
    const p=JSON.parse(JSON.stringify(g.progress));p.patrol=snapshot;change(p);
    assert.equal(new Game(p).vehicle.active,false);
  }
});

test('恢复乘坐不会回退已保存的车体升级与炮塔配置',()=>{
  const g=mounted(0);g.progress.patrol=capturePatrol(g);
  const p=validateProgress(g.progress);p.vehicleHulls[0]=4;p.vehicleWeapons[1]=1;p.vehicleLoadouts[0]=1;
  const restored=new Game(p);assert.equal(restored.vehicle.active,true);
  assert.equal(restored.vehicle.weaponIndex,1);assert.equal(restored.progress.vehicleHulls[0],4);
  assert.ok(restored.vehicle.maxHp>g.vehicle.maxHp);
});

test('刚领取赠车且工坊仍破败时，重新进入也保持骑木制自行车',()=>{
  const g=new Game(freshRangerProgress(),()=>.5);g.start();assert.equal(skipArrivalJourney(g),true);
  Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});
  // 正式上车入口同时接管赠车停车记录。
  assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.index,RANGER.giftHull);
  const restored=reload(g,true);restored.start();assert.equal(restored.vehicle.active,true);
  assert.equal(restored.progress.arrival.phase,'letter');assert.equal(parkedOwned(restored).length,0);
});

test('上下车和损毁事件立即保存最终乘坐状态',()=>{
  const g=mounted(0),saves=[];
  g.onEvent=createGameEventHandler({root:{getElementById:()=>({})},audio:{play(){}},toast:{show(){}},input:{reset(){}},
    save:()=>saves.push(capturePatrol(g).mountedVehicleIndex)});
  assert.equal(g.dismountVehicle(),true);assert.deepEqual(saves,[null]);
  assert.equal(g.summonVehicle(),true);assert.deepEqual(saves,[null,0]);
  absorbVehicleHit(g,1e9);assert.equal(saves.at(-1),null);assert.equal(saves.length,4);
});

test('秘境内下车不会覆盖冻结的森林乘坐状态，刷新后返回森林继续驾驶',()=>{
  const g=mounted(0);assert.equal(g.enterRealm('tower'),true);
  assert.equal(g.dismountVehicle(),true);syncRealm(g);
  const restored=reload(g,true);assert.equal(restored.vehicle.active,false);
  restored.leaveRealm();assert.equal(restored.vehicle.active,true);assert.equal(restored.vehicle.index,0);
});
