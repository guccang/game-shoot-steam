// 房门、售货员、原地停车和手机定位使用正式游戏对象的回归测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {validateProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS,interiorLayout,interiorShopkeeper,interiorWorkshopTargets} from '../src/config/workshop-interiors.js';
import {updateCottage,enterWorkshop} from '../src/core/cottage.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
import {parkedOwned,boardParkedVehicle,parkingOccupied,updateParkingVisitors} from '../src/core/camp-parking.js';
import {vehicleLocations,locateVehicle} from '../src/core/vehicle-location.js';
import {worldNavigationDiagnostics} from '../src/core/world-navigation.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {canonical,worldDistance} from '../src/world/coordinates.js';
import {canBuyFarmSeeds,buyFarmSeeds} from '../src/core/farm-seeds.js';
import {requestVehicleRepair,collectRepairedVehicle,updateVehicleRepair} from '../src/core/vehicle-repair.js';
import {REPAIR_BAY} from '../src/config/vehicle-repair.js';
import {requestParking,updateParking} from '../src/core/parking.js';
import {PARKING_SPOTS} from '../src/config/parking.js';

// 完成建筑修复并关闭无关战斗，让断言只覆盖本次正式规则。
function setup(){const p=ownedPineProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;const g=new Game(p);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.vehicle.active=false;g.progress.campParking.owned=[];return g;}
// 用固定小步长推进实际门口控制器，避免浮点阈值掩盖提前进入。
function dwell(g,seconds,input={x:0,y:0}){for(let t=0;t<seconds-1e-9;t+=.05)updateCottage(g,Math.min(.05,seconds-t),input);}

test('所有房屋站定一秒进入，移动取消，门口一秒离开并防止往返抖动',()=>{
 for(const layout of [interiorLayout({kind:'cottage'}),...Object.values(WORKSHOP_INTERIORS)]){
  const g=setup();g.progress.vehicleHulls[6]=1;Object.assign(g.player,layout.door,{vx:0,vy:0});
  dwell(g,.65);assert.equal(g.cottage,null,layout.id);dwell(g,.05,{x:1,y:0});assert.equal(g.cottageEntry,null);
  dwell(g,.95);assert.equal(g.cottage,null);dwell(g,.05);assert.equal(g.cottage.kind,layout.id);
  const seller=interiorShopkeeper(g.cottage);assert.ok(seller);assert.deepEqual(interiorWorkshopTargets(g),[seller]);
  Object.assign(g.player,layout.exit);dwell(g,.95);assert.ok(g.cottage);dwell(g,.05);assert.equal(g.cottage,null);
  assert.equal(g.cottageDoorLatch===true?'cottage':g.cottageDoorLatch,layout.id);dwell(g,2);assert.equal(g.cottage,null);
 }
});
test('暂停不推进门口计时，骑乘与未修复房屋不能进入，屋外不再显示房屋服务',()=>{
 const g=setup(),room=WORKSHOP_INTERIORS.seed;Object.assign(g.player,room.door,{vx:0,vy:0});dwell(g,.5);g.state='paused';dwell(g,3);assert.ok(Math.abs(g.cottageEntry-.5)<1e-9);g.state='playing';dwell(g,.5);assert.equal(g.cottage.kind,'seed');
 const other=setup();Object.assign(other.player,WORKSHOP_INTERIORS.vehicle.door);other.vehicle.active=true;dwell(other,2);assert.equal(other.cottage,null);other.vehicle.active=false;other.progress.restoration.repaired=[];dwell(other,2);assert.equal(other.cottage,null);
 const outside=setup();Object.assign(outside.player,room.door);assert.notEqual(nearbyInteraction(outside)?.type,'seed-shop');assert.equal(canBuyFarmSeeds(outside),false);
});
test('下车原地停车、读档和重新上车保留位置耐久与弹药，不远程召车',()=>{
 const g=setup();Object.assign(g.player,{x:1400,y:1000});assert.ok(g.summonVehicle());g.vehicle.hp*=.6;const before=canonical(g.player),hp=g.vehicle.hp;assert.ok(g.dismountVehicle());
 const record=g.progress.campParking.owned[0];assert.deepEqual({x:record.x,y:record.y},before);assert.equal(record.spot,null);assert.equal(record.mapId,'forest');assert.ok(worldDistance(g.player,before)>=60);
 capturePatrol(g);const restored=new Game(validateProgress(structuredClone(g.progress)));restored.state='playing';restored.trees=[];assert.deepEqual(parkedOwned(restored).map(s=>({x:s.x,y:s.y})),[before]);
 Object.assign(restored.player,{x:2400,y:2000});assert.equal(restored.summonVehicle(),false);Object.assign(restored.player,{x:before.x+70,y:before.y});assert.ok(boardParkedVehicle(restored,0));assert.equal(restored.vehicle.hp,hp);assert.equal(restored.progress.campParking.owned.length,0);assert.deepEqual(canonical(restored.player),before);
});
test('跨地图车辆只在真实地图显示，手机标出实际位置且不能跨地图召车',()=>{
 const g=setup();g.mapId='jiuzhaigou';g.player.mapId='jiuzhaigou';Object.assign(g.player,{x:1400,y:1000});g.summonVehicle();g.dismountVehicle();const location=vehicleLocations(g)[0];assert.equal(location.mapId,'jiuzhaigou');
 g.mapId='forest';g.player.mapId='forest';assert.equal(parkedOwned(g).length,0);assert.equal(g.summonVehicle(),false);assert.ok(locateVehicle(g,0).ok);assert.equal(worldNavigationDiagnostics(g).intent.site.mapId,'jiuzhaigou');assert.equal(vehicleLocations(g)[0].x,1400);
});
test('种子屋售货员可购买，维修中心接收门外车且室内等待修好后交到门外',()=>{
 const g=setup();Object.assign(g.player,WORKSHOP_INTERIORS.seed.door);assert.ok(enterWorkshop(g,'seed'));g.progress.farm.unlocked[0]=true;assert.ok(canBuyFarmSeeds(g));assert.ok(buyFarmSeeds(g,0,1).ok);
 const repair=setup();Object.assign(repair.player,REPAIR_BAY);repair.summonVehicle();repair.vehicle.hp*=.75;repair.dismountVehicle();Object.assign(repair.player,WORKSHOP_INTERIORS.repair.door);assert.ok(enterWorkshop(repair,'repair'));const room=repair.cottage,cost=repair.progress.coins;
 assert.ok(requestVehicleRepair(repair,0).ok);assert.ok(repair.progress.coins<cost);assert.equal(repair.cottage,room);repair.state='paused';updateVehicleRepair(repair,30);assert.equal(repair.progress.vehicleService[0].phase,'repairing');repair.state='playing';updateVehicleRepair(repair,13);assert.equal(repair.progress.vehicleService[0].phase,'ready');
 assert.ok(collectRepairedVehicle(repair,0).ok);assert.equal(repair.cottage,room);assert.equal(repair.vehicle.active,false);assert.equal(vehicleLocations(repair)[0].status,'原地停放');assert.equal(repair.vehicle.hp,repair.vehicle.maxHp);
});
test('停车提示只提供明确点击，停留不自动停车，点击后驶入固定泊位',()=>{
 const g=setup(),spot=PARKING_SPOTS.find(s=>s.id==='weapons-west');Object.assign(g.player,{x:spot.x,y:spot.approachY,vx:0,vy:0});g.summonVehicle();
 for(let i=0;i<100;i++)updateParking(g,.05);assert.equal(g.vehicle.active,true);assert.equal(g.progress.campParking.owned.length,0);assert.ok(requestParking(g));
 for(let i=0;i<500&&g.vehicle.active;i++)updateParking(g,.05);assert.equal(g.vehicle.active,false);assert.equal(g.progress.campParking.owned[0].spot,spot.id);
});

// 多辆路边车拥有独立坐标，不能被固定泊位去重误删。
test('多辆原地停车可独立读档，手动停入车位阻止访客和自动泊车重叠',()=>{
 const g=setup();g.progress.vehicleHulls[5]=1;g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:1300,y:1000,hp:.6,ammo:3},{hull:5,spot:null,mapId:'jiuzhaigou',x:1400,y:1000,hp:.8,ammo:4}];
 const saved=validateProgress(structuredClone(g.progress));assert.equal(saved.campParking.owned.length,2);assert.equal(saved.campParking.owned[1].mapId,'jiuzhaigou');
 const spot=PARKING_SPOTS.find(s=>s.id==='weapons-west');Object.assign(g.progress.campParking.owned[0],{x:spot.x,y:spot.y});g.parkingVisitors=[{spot:spot.id,model:'star'}];assert.equal(parkingOccupied(g,spot.id),true);updateParkingVisitors(g,.05);assert.equal(g.parkingVisitors.some(v=>v.spot===spot.id),false);
});
// 屋内主循环照常推进维修，暂停页面不消耗工时。
test('正式游戏更新在屋内推进维修，暂停冻结，取回多车不会重叠',()=>{
 const g=setup();Object.assign(g.player,WORKSHOP_INTERIORS.repair.door);assert.ok(enterWorkshop(g,'repair'));g.progress.vehicleHulls[5]=1;
 for(const hull of [0,5])g.progress.vehicleService[hull]={hp:.5,phase:'repairing',mapId:'forest',position:{...REPAIR_BAY},timer:11.9};
 g.state='paused';g.update(.05);assert.equal(g.progress.vehicleService[0].timer,11.9);g.state='playing';for(let i=0;i<3;i++)g.update(.05);assert.equal(g.progress.vehicleService[0].phase,'ready');
 assert.ok(collectRepairedVehicle(g,0).ok);assert.ok(collectRepairedVehicle(g,5).ok);const sites=vehicleLocations(g);assert.ok(worldDistance(sites.find(s=>s.hull===0),sites.find(s=>s.hull===5))>=85);
});
