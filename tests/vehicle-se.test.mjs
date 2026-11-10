// SE 装置集成回归：存档、重量、事务、实际弹道与自动控制边界。
import test from 'node:test';import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {seBuild,normalizeVehicleSE,seMass} from '../src/config/vehicle-se.js';
import {configureVehicleSE} from '../src/core/vehicles/vehicle-se.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {updateVehicleFlares} from '../src/world/vehicle-flares.js';
import {startSEControl,updateSEControl,updateSEDevices,absorbSEShield,seTargetAllowed} from '../src/combat/vehicle-se.js';
import {updateBallistics} from '../src/combat/ballistics.js';
import {requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {waystationMovementReason} from '../src/core/navigation/waystations.js';
// 建立真实游戏与已拥有重型坦克，避开新手剧情与房屋保护。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[1]=1;grantVehicleArmament(p,1);p.vehicleIndex=1;p.coins=20000;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.trees=[];g.enemies=[];g.boss=null;g.vehicle.active=true;g.livingPersist=()=>true;g.progress.campParking.owned=[];Object.assign(g.player,{x:9000,y:9000});return g;}
// 测试夹具安装只用于运行时场景，事务测试使用公开装配接口。
function equip(g,...keys){const b=seBuild(g.progress,1);b.owned=[...new Set([...b.owned,...keys])];b.installed=[...b.owned];return b;}
// 敌人使用真实生命与碰撞半径，供正式弹道命中。
function enemy(g,id,x=120){return {id,type:'enemy',x:g.player.x+x,y:g.player.y,hp:10000,maxHp:10000,radius:17,mass:1,speed:0};}
test('重型坦克默认照明、旧档迁移、卸下不重装、白名单与计时限幅',()=>{const p=freshProgress();delete p.vehicleSE;const migrated=validateProgress(p);assert.deepEqual(seBuild(migrated,1).installed,['flare']);assert.equal(seMass(migrated,0),0);migrated.vehicleSE[1].installed=[];assert.deepEqual(validateProgress(migrated).vehicleSE[1].installed,[]);const b=normalizeVehicleSE([{owned:['shield','shield','bad'],installed:['shield','rocket'],shield:Infinity,rocketWait:99}],1)[0];assert.deepEqual(b.installed,['shield']);assert.equal(b.shield,0);assert.equal(b.rocketWait,8);});
test('安装按重量扣费，拆卸保管、免费重装；存盘失败与超重完整回滚',()=>{const g=scene();g.cottage={kind:'vehicle'};const before=vehicleLoad(g,1).payload;assert.equal(configureVehicleSE(g,1,'shield','install').ok,true);assert.equal(vehicleLoad(g,1).payload,before+375);assert.equal(g.progress.coins,17000);seBuild(g.progress,1).shield=40;assert.equal(configureVehicleSE(g,1,'shield','remove').ok,true);assert.equal(vehicleLoad(g,1).payload,before);assert.equal(configureVehicleSE(g,1,'shield','install').ok,true);assert.equal(g.progress.coins,17000);assert.equal(seBuild(g.progress,1).shield,40);g.livingPersist=()=>false;const snapshot=structuredClone(g.progress);assert.equal(configureVehicleSE(g,1,'rocket','install').ok,false);assert.deepEqual(g.progress,snapshot);g.livingPersist=()=>true;g.progress.logistics.builds[1].wood=1e9;assert.equal(configureVehicleSE(g,1,'rocket','install').ok,false);assert.equal(g.progress.coins,17000);});
test('照明器卸下或关闭不发射，原有空中弹继续燃烧，别车不共享',()=>{const g=scene();g.surfaceNight=1;g.progress.supplies.vehicles[1].flare=5;updateVehicleFlares(g,.1);assert.equal(g.progress.supplies.vehicles[1].flare,4);seBuild(g.progress,1).installed=[];updateVehicleFlares(g,21);assert.equal(g.progress.supplies.vehicles[1].flare,4);assert.equal(g.progress.supplies.activeFlare,null);equip(g,'flare').disabled=['flare'];updateVehicleFlares(g,1);assert.equal(g.progress.supplies.vehicles[1].flare,4);});
test('护盾承伤、溢出、等待与暂停恢复、切车隔离',()=>{const g=scene(),b=equip(g,'shield');b.shield=180;assert.equal(absorbSEShield(g,210),30);assert.equal(b.shield,0);updateSEDevices(g,8);assert.equal(b.shield,0);updateSEDevices(g,2);assert.equal(b.shield,36);g.state='paused';updateSEDevices(g,5);assert.equal(b.shield,36);g.progress=validateProgress(g.progress);assert.equal(seBuild(g.progress,1).shield,36);g.vehicle.active=false;assert.equal(absorbSEShield(g,10),10);});
test('双联火箭消耗、冷却、实际扫掠直击溅射与空弹停射',()=>{const g=scene(),b=equip(g,'rocket');g.progress.supplies.vehicles[1].heavy=4;g.enemies=[enemy(g,1),enemy(g,2,150)];updateSEDevices(g,.1);assert.equal(g.progress.supplies.vehicles[1].heavy,2);assert.equal(g.projectiles.length,2);updateSEDevices(g,1);assert.equal(g.projectiles.length,2);for(let i=0;i<20;i++)updateBallistics(g,.02);assert.ok(g.enemies.every(t=>t.hp<10000));g.state='paused';updateSEDevices(g,99);assert.equal(b.rocketWait,7);g.state='playing';updateSEDevices(g,7);assert.equal(g.progress.supplies.vehicles[1].heavy,0);updateSEDevices(g,9);assert.equal(g.progress.supplies.vehicles[1].heavy,0);});
test('巡战真实范围、手动接管、暂停、换图与下车取消',()=>{const g=scene();equip(g,'combat');assert.equal(startSEControl(g,'combat').ok,true);const s=g.seControl;assert.equal(seTargetAllowed(g,enemy(g,1,300)),false);assert.equal(seTargetAllowed(g,enemy(g,1,100)),true);g.state='paused';updateSEControl(g,5,{x:0,y:0});assert.equal(s.clock,0);g.state='playing';updateSEControl(g,.1,{x:1,y:0});assert.equal(g.seControl,null);startSEControl(g,'combat');g.mapId='jiuzhaigou';updateSEControl(g,.1,{x:0,y:0});assert.equal(g.seControl,null);g.mapId='forest';startSEControl(g,'combat');g.vehicle.active=false;updateSEControl(g,.1,{x:0,y:0});assert.equal(g.seControl,null);});
test('来弹预测产生侧向避让，不能冲出巡战圈或穿树',()=>{const g=scene();equip(g,'combat');startSEControl(g,'combat');g.enemyBolts=[{x:g.player.x-130,y:g.player.y,dx:1,dy:0,speed:300,radius:8}];const v=updateSEControl(g,.05,{x:0,y:0});assert.ok(Math.abs(v.y)>.3);assert.ok(Math.hypot(v.x,v.y)<=1.001);g.player.x=g.seControl.anchor.x+260;assert.deepEqual(updateSEControl(g,.05,{x:0,y:0}),{x:0,y:0});assert.equal(g.seControl,null);});
test('自动驾驶要求装置与目标，正式寻路并到达停止，驿站同样检查装置',()=>{const g=scene();assert.equal(startSEControl(g,'autopilot').ok,false);assert.match(waystationMovementReason(g),/自动驾驶/);equip(g,'autopilot');assert.equal(startSEControl(g,'autopilot').ok,false);requestWorldNavigation(g,{x:9100,y:9000,mapId:'forest'},'测试目标',{direct:true});assert.equal(startSEControl(g,'autopilot').ok,true);let v;for(let i=0;i<10;i++)v=updateSEControl(g,.05,{x:0,y:0});assert.ok(v.x>0);Object.assign(g.player,{x:9090,y:9000});updateSEControl(g,.05,{x:0,y:0});assert.equal(g.seControl,null);});

test('五营地分别出售特色SE，购买仅入库，已购件可在异地按新重量反复装卸',async()=>{
 const {REGIONAL_CAMPS,regionalNpc}=await import('../src/config/regional-camps.js');
 const {VEHICLE_SE}=await import('../src/config/vehicle-se.js');
 const g=scene();
 const hull=0;
 g.progress.vehicleHulls[hull]=1;
 assert.deepEqual(Object.fromEntries(Object.entries(VEHICLE_SE).map(([id,d])=>[id,d.mass])),{
  flare:90,autopilot:160,combat:240,rocket:475,shield:375
 });
 assert.equal(seMass(validateProgress(g.progress),1),90);
 assert.equal(new Set(REGIONAL_CAMPS.map(c=>c.seDevice)).size,5);
 for(const [i,camp] of REGIONAL_CAMPS.entries()){
  const key=camp.seDevice;
  const nextCamp=REGIONAL_CAMPS[(i+1)%REGIONAL_CAMPS.length];
  const coins=g.progress.coins;
  Object.assign(g.player,regionalNpc(nextCamp));
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,false);
  assert.equal(configureVehicleSE(g,hull,key,'install').ok,false);
  Object.assign(g.player,regionalNpc(camp));
  const load=vehicleLoad(g,hull).payload;
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,true);
  assert.equal(configureVehicleSE(g,hull,key,'buy').ok,false);
  assert.equal(vehicleLoad(g,hull).payload,load);
  Object.assign(g.player,regionalNpc(nextCamp));
  assert.equal(configureVehicleSE(g,hull,key,'install').ok,true);
  assert.equal(vehicleLoad(g,hull).payload,load+VEHICLE_SE[key].mass);
  assert.equal(configureVehicleSE(g,hull,key,'remove').ok,true);
  assert.equal(vehicleLoad(g,hull).payload,load);
  assert.equal(g.progress.coins,coins-VEHICLE_SE[key].coins);
 }
});
