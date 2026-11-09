// 红狼压碎树干且零收益，覆盖实际移动、下车安全、损毁与会话恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {riverXAt} from '../src/world/river-geometry.js';
import {vehicleParkingSite} from '../src/core/vehicles/camp-parking.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../src/core/realms/realm-vehicles.js';
import {absorbVehicleHit,crushVehicleTrees} from '../src/combat/vehicle.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {questLineClear} from '../src/physics/quest-route.js';
const WOLF=COLLECTED_VEHICLES.findIndex(v=>v.id==='red-wolf');
// 在真实森林地形中找到平整走廊，只注入一棵用于验证树干碰撞的树。
function scene(index=WOLF){
 const p=freshProgress();p.vehicleHulls.fill(1);p.vehicleIndex=index;
 const g=new Game(p,()=>.5);g.start();g.enemies=[];g.boss=null;
 let spot;
 for(let y=400;y<2600&&!spot;y+=80)for(let x=800;x<2600&&!spot;x+=80){
  if([-80,-40,0,40,80].every(dx=>!blocked(x+dx,y,20,[],{mapId:'forest',livingCollision:true})))spot={x,y};
 }
 assert.ok(spot);Object.assign(g.player,{x:spot.x-70,y:spot.y,livingCollision:true});
 g.trees=[{id:999,type:'tree',...spot,radius:20,hp:100,maxHp:100}];assert.ok(g.summonVehicle());return g;
}

test('红狼可规划压树路线，普通坦克仍受阻；只读碰撞和寻路不会提前毁树',()=>{
 for(const index of [WOLF,0]){
  const g=scene(index),tree=g.trees[0],before=g.progress.wood;
  assert.equal(blocked(tree.x,tree.y,12,g.trees,g.player),index!==WOLF);
  assert.equal(blocked(tree.x,tree.y,12,new SpatialGrid(g.trees),g.player),index!==WOLF);
  assert.equal(questLineClear(g.player,{x:tree.x+70,y:tree.y},g.player,g.trees),index===WOLF);
  moveBody(g.player,140,0,WORLD,12,g.trees);
  if(index===WOLF)assert.equal(g.player.x,tree.x+70);else assert.ok(g.player.x<tree.x-30);
  assert.equal(tree.hp,100);assert.equal(g.progress.wood,before);
 }
});

test('穿树不会穿过河流、建筑护栏、停车车体与战斗边界',()=>{
 const g=scene(),tree=g.trees[0];
 assert.equal(blocked(riverXAt(100),100,12,[],g.player),true);
 for(const key of ['worldBarriers','parkingBarriers'])assert.equal(blocked(tree.x,tree.y,12,g.trees,{...g.player,[key]:[{...tree,width:40,height:40}]}),true);
 assert.equal(blocked(tree.x+300,tree.y,12,g.trees,{...g.player,arena:{...tree,radius:100,terrain:'forest'}}),true);
});

test('树干内主动下车或装甲损毁会退到安全落点，随后恢复步行碰撞',()=>{
 for(const destroyed of [false,true]){
  const g=scene(),tree=g.trees[0];Object.assign(g.player,{x:tree.x,y:tree.y});
  if(destroyed)absorbVehicleHit(g,1e9);else assert.ok(g.dismountVehicle());
  assert.equal(g.vehicle.active,false);assert.equal(g.player.treePass,false);
  assert.equal(blocked(g.player.x,g.player.y,12,g.trees,g.player),false);
  assert.equal(blocked(tree.x,tree.y,12,g.trees,g.player),true);
 }
});

test('读档与秘境载具快照恢复红狼能力，下车及换车型不遗留能力',()=>{
 const g=scene();g.progress.patrol=capturePatrol(g);
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);restored.start();
 assert.equal(restored.vehicle.active,true);assert.equal(restored.player.treePass,true);
 const snapshot=captureRealmVehicles(g);assert.ok(g.dismountVehicle());restoreRealmVehicles(g,snapshot);
 assert.equal(g.vehicle.active,true);assert.equal(g.player.treePass,true);
 Object.assign(g.player,vehicleParkingSite(g,0));
 assert.ok(g.selectVehicle(0));assert.equal(g.player.treePass,false);assert.ok(g.summonVehicle());assert.equal(g.player.treePass,false);
});

// 正式移动帧必须压碎实际接触的树；不依赖发射炮弹或调用命中奖励。
test('红狼实际行驶压碎树木并生成碎片和单个树桩，不发木材金币或采集进度',()=>{
 for(const index of [WOLF,0]){
  const g=scene(index),tree=g.trees[0];Object.assign(tree,{size:1,variant:'round',palette:'meadow',flash:0});
  g.progress.mainline.completed=[...MAINLINE_IDS];g.progress.mainline.phase='complete';
  g.updateWaves=()=>{};g.updateWeaponAbility=()=>{};g.attack=()=>false;g.vehicle.weaponIndex=null;g.attackTimer=999;
  const before={wood:g.progress.wood,coins:g.progress.coins,chopped:g.chopped,drops:g.drops.length,stumps:g.stumps.length};
  for(let i=0;i<100;i++)g.update(.02,{x:1,y:0});
  assert.equal(tree.hp===0,index===WOLF);assert.equal(g.stumps.length-before.stumps,index===WOLF?1:0);
  assert.equal(g.progress.wood,before.wood);assert.equal(g.progress.coins,before.coins);
  assert.equal(g.chopped,before.chopped);assert.equal(g.drops.length,before.drops);
  if(index===WOLF){assert.ok(g.player.x>tree.x+32);assert.ok(!g.trees.includes(tree));}
 }
});

// 扫掠覆盖高速位移与环形地图接缝，同一棵树不会重复破碎。
test('压树扫掠不漏接缝，不误伤旁边的树，停车重复检测和步行不产生额外树桩',()=>{
 const g=scene(),tree=g.trees[0];Object.assign(tree,{x:4,y:700,size:1,variant:'round',palette:'meadow'});
 const miss={...tree,id:1000,y:780};g.trees.push(miss);Object.assign(g.player,{x:50,y:700});
 const before=g.stumps.length;crushVehicleTrees(g,{x:WORLD.width-50,y:700});
 assert.equal(tree.hp,0);assert.equal(miss.hp,100);assert.equal(g.stumps.length,before+1);
 assert.ok(g.fx.items.some(f=>f.material==='wood'));
 crushVehicleTrees(g,{x:WORLD.width-50,y:700});assert.equal(g.stumps.length,before+1);
 g.vehicle.active=false;Object.assign(g.player,{x:4,y:780});crushVehicleTrees(g,g.player);assert.equal(miss.hp,100);
});
