// 建筑实体与自动交付回归：高速和飞行均不能穿墙，真实入口和车库保持连通。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORLD_BUILDINGS} from '../src/config/world-buildings.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORKSHOP_INTERIORS,interiorLayout} from '../src/config/workshop-interiors.js';
import {REPAIR_BAY,REPAIR_CENTER,TOW_TRUCK} from '../src/config/vehicle-repair.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {restoreTownPosition} from '../src/core/camp/town-layout.js';
import {updateVehicleRepair} from '../src/core/vehicles/vehicle-repair.js';
import {vehicleServiceObjects} from '../src/rendering/vehicle-repair.js';
import {vehicleLocations} from '../src/core/vehicles/vehicle-location.js';
import {parkingRecordSite} from '../src/progression/vehicles/roadside-parking.js';
import {validateProgress} from '../src/progression/progress.js';
// 使用正式世界与完整建筑，关闭与本次规则无关的剧情状态。
function setup(){const p=ownedPineProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(x=>x.id);const g=new Game(p);g.state='playing';g.enemies=[];g.progress.campParking.owned=[];return g;}

test('所有登记建筑的墙体阻挡步行、驾驶和低空高速扫掠，包括循环镜像',()=>{
 for(const b of WORLD_BUILDINGS)for(const rect of b.rects)for(const flying of [false,true])for(const shift of [0,WORLD.width]){
  const [l,t,r,d]=rect,body={x:b.x+l-40+shift,y:b.y+(t+d)/2,mapId:'forest',flying,legendaryBuilding:true};
  assert.equal(blocked(b.x+(l+r)/2+shift,body.y,12,[],body),true,b.id);
  moveBody(body,r-l+80,0,WORLD,12,[]);assert.ok(body.x<b.x+r+shift,b.id+' 横向穿墙');
  Object.assign(body,{x:b.x+(l+r)/2+shift,y:b.y+d+40});moveBody(body,0,t-d-80,WORLD,12,[]);assert.ok(body.y>b.y+t,b.id+' 纵向穿墙');
 }
});

test('完整森林中全部房门可达，飞行寻路也绕开住宅，其他地图不套用森林建筑',()=>{
 const g=setup(),body={x:350,y:220,mapId:'forest',livingCollision:true,legendaryBuilding:true};
 for(const l of [interiorLayout({kind:'cottage'}),...Object.values(WORKSHOP_INTERIORS)]){
  const origin=l.id==='legendary'?{...body,x:l.site.x,y:l.site.y+150}:body;
  assert.ok(planQuestRoute(origin,l.door,g.trees,24000).reachable,l.id);
 }
 const c=WORLD_BUILDINGS.find(b=>b.id==='cottage'),a={x:c.x-110,y:c.y-40,mapId:'forest',flying:true},end={x:c.x+130,y:c.y-40};
 assert.equal(questLineClear(a,end,a,[]),false);assert.ok(planQuestRoute(a,end,[]).reachable);
 assert.equal(blocked(c.x,c.y-50,12,[],{mapId:'jiuzhaigou',flying:true}),false);
});

test('旧档角色和任意停放车辆就近移出新墙体，耐久弹药不变',()=>{
 const g=setup(),b=WORLD_BUILDINGS.find(b=>b.id==='weapons');Object.assign(g.player,{x:b.x,y:b.y-50});
 g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:b.x,y:b.y-50,hp:.6,ammo:2,reload:1}];assert.ok(restoreTownPosition(g));
 const car=g.progress.campParking.owned[0];assert.equal(blocked(car.x,car.y,30,g.trees,{mapId:'forest'}),false);assert.equal(blocked(g.player.x,g.player.y,12,g.trees,g.player),false);assert.equal(car.hp,.6);assert.equal(car.ammo,2);assert.ok(worldDistance(car,b)<320);
});

test('维修完成直接交付北停车场并可定位，角色保持原地且维修门口不留交付车',()=>{
 const g=setup();Object.assign(g.player,{x:1800,y:1800});const before={x:g.player.x,y:g.player.y};g.vehicle.hp=1;g.progress.vehicleService[0]={hp:.1,phase:'repairing',mapId:'forest',position:REPAIR_BAY,timer:11.9};
 updateVehicleRepair(g,.2);assert.equal(g.progress.vehicleService[0].phase,null);const car=g.progress.campParking.owned[0];assert.match(car.spot,/^north-/);assert.equal(car.hp,1);assert.deepEqual({x:g.player.x,y:g.player.y},before);assert.equal(g.vehicle.active,false);
 assert.equal(vehicleLocations(g)[0].status,'停车场');assert.ok(worldDistance(parkingRecordSite(car),REPAIR_CENTER)>500);assert.equal(vehicleServiceObjects(g).some(o=>o.type==='repair-bay'),false);
 assert.equal(validateProgress(g.progress).campParking.owned[0].spot,car.spot);
});

test('满停车场保管完成车，暂停不交付，空位后仅交付一次且不切换正在驾驶的车',()=>{
 const g=setup();g.progress.vehicleHulls.fill(1);const slots=PARKING_SPOTS.filter(s=>s.building==='north');g.progress.campParking.owned=slots.map((s,i)=>({hull:i+1,spot:s.id,hp:.7,ammo:1,reload:0}));
 g.progress.vehicleService[0]={hp:1,phase:'ready',mapId:'forest',position:REPAIR_BAY,timer:12};updateVehicleRepair(g,1);assert.equal(g.progress.vehicleService[0].phase,'ready');assert.equal(vehicleServiceObjects(g).some(o=>o.type==='repair-bay'),false);
 g.progress.campParking.owned.shift();g.vehicle=g.vehicles[8];g.vehicle.active=true;g.progress.vehicleIndex=8;g.state='paused';updateVehicleRepair(g,1);assert.equal(g.progress.vehicleService[0].phase,'ready');g.state='playing';updateVehicleRepair(g,1);updateVehicleRepair(g,1);
 assert.equal(g.progress.vehicleService[0].phase,null);assert.equal(g.progress.campParking.owned.filter(p=>p.hull===0).length,1);assert.equal(g.vehicle.index,8);assert.ok(g.vehicle.active);
});

test('旧档已修好订单自动交付，访客让出交付位且保留原持有金币',()=>{
 const g=setup(),slot=PARKING_SPOTS.find(s=>s.building==='north');g.parkingVisitors=[{spot:slot.id,model:'sample'}];g.progress.vehicleService[0]={hp:1,phase:'ready',position:REPAIR_BAY,mapId:'forest',timer:12};const coins=g.progress.coins;
 updateVehicleRepair(g,.1);assert.equal(g.progress.coins,coins);assert.equal(g.parkingVisitors.length,0);assert.equal(g.progress.campParking.owned[0].spot,slot.id);
 assert.ok(TOW_TRUCK.width<=110);assert.ok(TOW_TRUCK.navigationRadius>=30);
});

// 自动交付避开玩家正在驾驶但尚未形成停车记录的车辆。
test('交付车位避让正在停车场行驶的车辆',()=>{
 const g=setup(),slot=PARKING_SPOTS.find(s=>s.building==='north');g.progress.vehicleHulls[8]=1;g.vehicle=g.vehicles[8];g.vehicle.active=true;Object.assign(g.player,slot);
 g.progress.vehicleService[0]={hp:1,phase:'ready',position:REPAIR_BAY,mapId:'forest',timer:12};updateVehicleRepair(g,.1);
 const delivered=g.progress.campParking.owned.find(r=>r.hull===0);assert.ok(delivered);assert.notEqual(delivered.spot,slot.id);assert.ok(worldDistance(parkingRecordSite(delivered),g.player)>=85);assert.ok(g.vehicle.active);
});
