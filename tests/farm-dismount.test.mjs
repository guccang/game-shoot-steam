// 驾驶只放行种田入口，实际事务与演出、暂停限制必须继续生效。
import test from 'node:test';
import assert from 'node:assert/strict';
import {canEnterFarm,canUseFarm,farmWorking,setFarmTool,queueFarmWork} from '../src/core/farming/farm.js';
import {enterFarmVehicle,restoreFarmVehicle,validateFarmVehicleReturn} from '../src/core/farming/farm-vehicle.js';
import {updateSceneApproach} from '../src/core/navigation/scene-approach.js';
import {updateVehicleBoarding} from '../src/core/vehicles/vehicle-boarding.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD} from '../src/world/coordinates.js';
import {Game,freshProgress} from '../src/game.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {clearingSite} from '../src/progression/story/clearing-site.js';

// 使用真实已拥有载具与上下车入口，隔离开场停车和随机战斗。
function mounted(hull=0){
 const p=freshProgress();p.arrival=null;p.vehicleIndex=hull;p.vehicleHulls[hull]=1;grantVehicleArmament(p,hull);
 const g=new Game(p,()=>.5);g.start();g.trees=[];g.enemies=[];Object.assign(g.player,{x:900,y:750});assert.ok(g.summonVehicle());
 g.vehicle.hp=73;if(g.vehicle.module)Object.assign(g.vehicle.module.magazine,{ammo:2,remaining:.7});return g;
}

// 真实入口在任何下车副作用之前拒绝战斗，角色武器短射程不应漏掉载具已发现的敌人。
test('战斗中种地入口不下车、不改耐久弹药或返车意图',()=>{
 const g=mounted(1),vehicle=g.vehicle,magazine=structuredClone(vehicle.module?.magazine);
 const enemy={id:981,type:'enemy',hp:100,radius:12,x:g.player.x+vehicleWeapon(g.loadout,g.vehicle.weaponIndex).range-1,y:g.player.y};
 g.combatSight=new WeakMap([[enemy,enemy.id]]);g.enemies=[enemy];
 assert.equal(enterFarmVehicle(g).message,'战斗中暂不可种地');assert.equal(g.vehicle,vehicle);assert.equal(vehicle.active,true);
 assert.equal(vehicle.hp,73);assert.deepEqual(vehicle.module?.magazine,magazine);assert.ok(!g.farmVehicleReturn);assert.ok(!g.farmWork);
 enemy.hp=0;assert.equal(enterFarmVehicle(g).dismounted,true);
});

// 发现记忆不等于正在交战；离开车炮射程后各车型均应能够安全下车种田。
test('远处已发现敌人不把乘车种地误判为战斗，原车状态完整保留',()=>{
 for(const hull of [0,1,2,3,5,6,7,8]){
  const g=mounted(hull),vehicle=g.vehicle,magazine=structuredClone(vehicle.module?.magazine);
  g.viewport={width:390,height:844};
  const enemy={id:982,type:'enemy',hp:100,radius:12,x:g.player.x+1500,y:g.player.y};
  g.enemies=[enemy];g.combatSight=new WeakMap([[enemy,enemy.id]]);
  assert.equal(enterFarmVehicle(g).dismounted,true,'车型 '+hull);
  setFarmTool(g,'hoe');assert.equal(farmWorking(g),true);assert.equal(g.farmWork.autoCombat,false);
  setFarmTool(g,null);assert.ok(restoreFarmVehicle(g));assert.equal(g.vehicle,vehicle);
  assert.equal(vehicle.hp,73);assert.deepEqual(vehicle.module?.magazine,magazine);
 }
});

// 装盾隔离手持武器射程，边界采用正式车炮规则；无炮车辆不凭视野产生车炮战斗。
test('车炮射程内怪物和首领仍拦截，射程外可见目标与无炮车辆不误拦截',()=>{
 for(const boss of [false,true]){
  const g=mounted(1);g.progress.weapons[18]=1;g.progress.weapon=18;
  const range=vehicleWeapon(g.loadout,g.vehicle.weaponIndex).range;
  const enemy={id:983,type:boss?'boss':'enemy',hp:100,radius:12,x:g.player.x+range,y:g.player.y};
  if(boss)g.boss=enemy;else g.enemies=[enemy];
  assert.equal(enterFarmVehicle(g).ok,false);assert.equal(g.vehicle.active,true);
  enemy.x+=1;assert.equal(enterFarmVehicle(g).dismounted,true);
 }
 const g=mounted(5);g.progress.weapons[18]=1;g.progress.weapon=18;
 g.enemies=[{id:984,type:'enemy',hp:100,radius:12,x:g.player.x+100,y:g.player.y}];
 assert.equal(enterFarmVehicle(g).dismounted,true);
});

// 清缴波次间隙和自动迎敌警戒都维持原状态，不能以重新打开农具重置恢复计时。
test('清缴中没有活怪也不允许种地，警戒保留原农活队列',()=>{
 const g=mounted();g.progress.living.patrolActive=true;Object.assign(g.player,clearingSite(g.progress));
 assert.equal(enterFarmVehicle(g).ok,false);assert.equal(g.vehicle.active,true);
 g.progress.living.patrolActive=false;Object.assign(g.player,{x:900,y:750});assert.ok(enterFarmVehicle(g).ok);
 setFarmTool(g,'hoe');const work=g.farmWork;work.autoCombat=true;work.combatRecovery=1;work.queue.push({id:99});
 assert.equal(enterFarmVehicle(g).ok,false);assert.equal(g.farmWork,work);assert.equal(work.combatRecovery,1);assert.equal(work.queue.length,1);
});

test('两张世界地图允许驾驶时进入种田，实际动作仍需先下车',()=>{
 for(const mapId of ['forest','jiuzhaigou']){
  const game={mapId,state:'playing',vehicle:{active:true},player:{hp:100}};
  assert.equal(canEnterFarm(game),true);assert.equal(canUseFarm(game),false);
  setFarmTool(game,'hoe');assert.equal(game.farmWork,null);
  assert.equal(queueFarmWork(game,'dig').ok,false);
  game.vehicle.active=false;assert.equal(canUseFarm(game),true);
  setFarmTool(game,'hoe');assert.equal(farmWorking(game),true);
 }
});

test('驾驶入口不绕过暂停、其他场景、演出或对话限制',()=>{
 const base={mapId:'forest',state:'playing',vehicle:{active:true},player:{hp:100}};
 for(const flag of ['story','realm','arrivalCinematic','cottage','workshopTrial','campDefense','fireActive','mainlineSpeech'])
  assert.equal(canEnterFarm({...base,[flag]:true}),false,flag);
 for(const state of ['paused','menu','dead'])assert.equal(canEnterFarm({...base,state}),false,state);
 assert.equal(canEnterFarm({...base,mapId:'unknown'}),false);
 assert.equal(canEnterFarm({...base,player:null}),false);
});

test('驾驶进入种地后退出恢复原车，换工具与临时战斗不丢失返车意图',()=>{
 for(const hull of [0,1,2,3,5,6,7,8]){
  const g=mounted(hull),vehicle=g.vehicle,magazine=structuredClone(vehicle.module?.magazine);
  assert.ok(enterFarmVehicle(g).dismounted);assert.equal(vehicle.active,false);
  for(const tool of ['hoe','water',null,'harvest']){setFarmTool(g,tool);validateFarmVehicleReturn(g);assert.equal(g.farmVehicleReturn.vehicle,vehicle);}
  assert.ok(enterFarmVehicle(g).ok);setFarmTool(g,null);assert.ok(restoreFarmVehicle(g));
  assert.equal(vehicle.active,false);assert.equal(g.sceneApproach.id,'farm-vehicle');
  // 真实步行至车旁后才开始候停，不能退出当帧恢复驾驶。
  for(let i=0;i<400&&!vehicle.active;i++){
   const input=updateSceneApproach(g,.04,{x:0,y:0});updateVehicleBoarding(g,.04);driveBody(g.player,input,140,.04,WORLD,g.trees);
  }
  assert.equal(g.vehicle,vehicle);assert.ok(vehicle.active);assert.equal(vehicle.hp,73);assert.deepEqual(vehicle.module?.magazine,magazine);
  assert.equal(g.player.flying,hull===2);assert.equal(g.player.amphibious,hull===3);assert.equal(g.farmVehicleReturn,null);
  assert.equal(restoreFarmVehicle(g),false);
 }
});

test('步行进入不自动上车，下车失败不记录返车；暂停可保留并退出',()=>{
 const g=mounted();assert.ok(g.dismountVehicle());assert.ok(enterFarmVehicle(g).ok);assert.equal(restoreFarmVehicle(g),false);assert.equal(g.vehicle.active,false);
 assert.ok(g.summonVehicle());const dismount=g.dismountVehicle;g.dismountVehicle=()=>false;
 assert.equal(enterFarmVehicle(g).ok,false);assert.equal(g.farmVehicleReturn,null);assert.ok(g.vehicle.active);g.dismountVehicle=dismount;
 assert.ok(enterFarmVehicle(g).ok);setFarmTool(g,'hoe');g.pause();validateFarmVehicleReturn(g);assert.ok(g.farmVehicleReturn);
 assert.equal(canEnterFarm(g),false);setFarmTool(g,null);assert.ok(restoreFarmVehicle(g));assert.equal(g.state,'paused');
});

test('死亡、场景变化、换车或损毁不会借种地退出召回旧车',()=>{
 for(const change of [g=>g.state='dead',g=>g.mapId='jiuzhaigou',g=>g.story={},g=>g.player={...g.player},g=>g.vehicle={...g.vehicle},g=>g.vehicle.hp=0,g=>g.vehicle.cooldown=5,g=>g.reset()]){
  const g=mounted();assert.ok(enterFarmVehicle(g).ok);change(g);assert.equal(restoreFarmVehicle(g),false);assert.equal(g.vehicle.active,false);assert.equal(g.farmVehicleReturn,null);
 }
});
