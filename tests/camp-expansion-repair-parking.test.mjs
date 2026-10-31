// 营地扩建验证正式碰撞、循环镜像、泊车、维修与在途旧档，不使用替代地图。
import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterCampLevel} from '../src/core/monster-camps.js';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MONSTER_CAMPS,MONSTER_CAMP_RULES,campSignSite,campCacheSite,campVisitorSite} from '../src/config/monster-camps.js';
import {TOWN_LAYOUT} from '../src/config/town-layout.js';
import {REPAIR_CENTER as R,REPAIR_BAY,REPAIR_LAYOUT_VERSION} from '../src/config/vehicle-repair.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORLD,canonical,worldDistance} from '../src/world/coordinates.js';
import {blocked} from '../src/physics/motion.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {requestParking,updateParking} from '../src/core/parking.js';
import {boardParkedVehicle} from '../src/core/camp-parking.js';
import {requestVehicleRepair,updateVehicleRepair,collectRepairedVehicle} from '../src/core/vehicle-repair.js';
import {validateProgress} from '../src/progression/progress.js';
import {enterWorkshop} from '../src/core/cottage.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {parkedVehicleObjects} from '../src/rendering/parked-vehicles.js';
import {parkingGaragePose} from '../src/rendering/parking.js';
import {settlementAt,settlementBlocked} from '../src/world/settlements.js';
import {livingRoadDistance} from '../src/world/living-spaces.js';
const spots=PARKING_SPOTS.filter(s=>s.building==='repair');
// 使用真实森林树木与已解锁自有车辆，排除剧情或访客对测试初始场景的干扰。
function setup(){const p=ownedPineProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=100000;const g=new Game(p);g.state='playing';g.enemies=[];g.boss=null;g.parkingVisitors=[];g.progress.campParking.owned=[];g.vehicle.active=false;return g;}

test('西扩营地内外边界正确，新增道路跨世界接缝仍可识别',()=>{
 assert.equal(TOWN_LAYOUT.bounds.left,-780);assert.ok(R.x<-180);assert.equal(spots.length,3);
 for(const x of [-700,-700+WORLD.width]){assert.equal(settlementAt({x,y:1000}).id,'sunleaf');assert.equal(settlementAt({x,y:1500}),null);assert.equal(settlementBlocked(x,1400),true);}
 assert.equal(settlementBlocked(-780,729,18),false);assert.ok(livingRoadDistance(canonical({x:-640,y:1000}))<1);
});

test('野怪警戒和交互点留在扩建围栏之外',()=>{
 assert.deepEqual(MONSTER_CAMPS.filter(c=>c.mapId==='forest').map(monsterCampLevel),[2,4,7,10,13,16,20]);
 for(const camp of MONSTER_CAMPS.filter(c=>c.mapId==='forest')){
  assert.equal(settlementAt(camp,MONSTER_CAMP_RULES.warningRadius),null,camp.id);
  for(const site of [campSignSite(camp),campCacheSite(camp),campVisitorSite(camp)])assert.equal(settlementAt(site,25),null,site.id);
 }
});

test('真实森林中维修门口、泊位、交付区和西门都可通行，墙柱与后墙不可穿过',()=>{
 const g=setup(),start={x:350,y:220,mapId:'forest',livingCollision:true,navigationRadius:18};
 for(const target of [...spots.map(s=>({x:s.x,y:s.approachY})),WORKSHOP_INTERIORS.repair.door,REPAIR_BAY,{x:-820,y:729}])assert.ok(planQuestRoute(start,target,g.trees,24000).reachable,JSON.stringify(target));
 for(const dx of [0,WORLD.width]){
  assert.equal(blocked(R.x+dx,R.y-42,12,g.trees,start),false);
  for(const [x,y] of [[R.x+90,R.y],[R.x,R.y-110]])assert.equal(blocked(x+dx,y,12,g.trees,start),true);
 }
 assert.ok(planQuestRoute({...start,...WORKSHOP_INTERIORS.repair.door},{x:50,y:1065},g.trees).reachable);
});

test('三个维修泊位与周期镜像均可 P 倒车、刷新、重新上车并保留耐久',()=>{
 for(const spot of spots)for(const shift of [0,WORLD.width]){
  const g=setup();Object.assign(g.player,{x:spot.x+shift,y:spot.approachY,vx:0,vy:0});assert.ok(g.summonVehicle());g.vehicle.hp*=.7;
  updateParking(g,5);assert.ok(g.vehicle.active);assert.ok(requestParking(g),spot.id);
  for(let i=0;i<300&&g.vehicle.active;i++)updateParking(g,.05);
  assert.equal(g.vehicle.active,false,spot.id);const saved=g.progress.campParking.owned[0];assert.equal(saved.spot,spot.id);assert.ok(saved.hp<.71);
  const loaded=validateProgress(structuredClone(g.progress));assert.equal(loaded.campParking.owned[0].spot,spot.id);
  if(spot.indoor){const item=parkedVehicleObjects(g).find(s=>s.hull===0);assert.equal(item.y+item.depthOffset,R.y+2);assert.deepEqual(parkingGaragePose({x:spot.x+shift,y:spot.y},{active:true}),{x:R.x+shift,y:R.y});}
  Object.assign(g.player,{x:spot.x+shift,y:spot.y+65});assert.ok(boardParkedVehicle(g,0));assert.ok(g.vehicle.hp<g.vehicle.maxHp*.71);
 }
});

test('维修库内停驻车可由室内售货员保养，交车位置不压住房门',()=>{
 const g=setup(),spot=spots.find(s=>s.indoor);Object.assign(g.player,{x:spot.x,y:spot.approachY});g.summonVehicle();g.vehicle.hp*=.5;requestParking(g);
 for(let i=0;i<300&&g.vehicle.active;i++)updateParking(g,.05);
 Object.assign(g.player,WORKSHOP_INTERIORS.repair.door);assert.ok(enterWorkshop(g,'repair'));assert.ok(requestVehicleRepair(g,0).ok);updateVehicleRepair(g,13);assert.ok(collectRepairedVehicle(g,0).ok);
 const car=g.progress.campParking.owned[0];assert.ok(worldDistance(car,WORKSHOP_INTERIORS.repair.door)>65);assert.equal(blocked(car.x,car.y,30,g.trees,{mapId:'forest',livingCollision:true}),false);
});

test('旧档出车、挂钩和返程续接新维修区，费用和残骸位置不变',()=>{
 for(const phase of ['outbound','hooking','towing'])for(const truckX of [180,-780]){
  const g=setup(),position={x:220,y:835};g.vehicle.hp=0;g.progress.vehicleService[0]={hp:0,phase,mapId:'forest',position,truck:{x:truckX,y:835},route:[{x:150,y:835},position],step:1,timer:0,wheel:0,layoutVersion:0};
  const coins=g.progress.coins;updateVehicleRepair(g,.05);assert.deepEqual(g.progress.vehicleService[0].position,position);
  for(let i=0;i<2000&&g.progress.vehicleService[0].phase!=='ready';i++)updateVehicleRepair(g,.05);
  const r=g.progress.vehicleService[0];assert.equal(r.phase,'ready');assert.equal(r.layoutVersion,REPAIR_LAYOUT_VERSION);assert.deepEqual(r.position,REPAIR_BAY);assert.equal(g.progress.coins,coins);
  for(let i=1;i<r.route.length;i++)assert.ok(questLineClear(r.route[i-1],r.route[i],{mapId:'forest',livingCollision:true,navigationRadius:18},g.trees));
 }
});

test('旧档待取和维修中迁到新交付区，不重置工时、不改写普通原地停车',()=>{
 for(const phase of ['repairing','ready']){const g=setup(),raw=structuredClone(g.progress);raw.vehicleService[0]={hp:.4,phase,mapId:'forest',position:{x:150,y:835},timer:7};const p=validateProgress(raw);assert.deepEqual(p.vehicleService[0].position,REPAIR_BAY);assert.equal(p.vehicleService[0].timer,7);assert.deepEqual(validateProgress(p),p);}
 const raw=setup().progress;raw.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:150,y:835,hp:.8,ammo:0,reload:0}];assert.equal(validateProgress(raw).campParking.owned[0].x,150);
});
