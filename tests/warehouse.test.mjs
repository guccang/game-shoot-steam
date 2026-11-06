// 仓库定向验证：建筑、真实库存、负重、权限和失败回滚。
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {canUseWarehouse,warehouseVehicles,transferWarehouse,warehouseTransferPreview} from '../src/core/warehouse.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {updateCottage,enterWorkshop} from '../src/core/cottage.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {blocked} from '../src/physics/motion.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
// 使用正式游戏和存档，仅准备仓库入口及可持续保存的测试环境。
function setup(){const g=new Game(freshProgress());g.state='playing';g.livingPersist=()=>true;g.mainlineSpeech=null;g.vehicle.active=false;g.cottage=null;Object.assign(g.player,WORKSHOP_INTERIORS.warehouse.door);return g;}
test('仓库保留实体墙和通路，门前直接存取且不会进入房间',()=>{
 const g=setup(),room=WORKSHOP_INTERIORS.warehouse,body={mapId:'forest',livingCollision:true};g.cottage=null;
 assert.ok(blocked(WAREHOUSE.x,WAREHOUSE.y-40,12,g.trees,body));assert.equal(blocked(room.door.x,room.door.y,12,g.trees,body),false);
 assert.ok(planQuestRoute({...body,x:600,y:700},room.door,g.trees,24000).reachable);
 for(const s of PARKING_SPOTS.filter(s=>s.building==='north'))assert.equal(blocked(s.x,s.approachY,32,g.trees,body),false,s.id);
 Object.assign(g.player,room.door,{vx:0,vy:0});for(let i=0;i<19;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);assert.equal(enterWorkshop(g,'warehouse'),false);assert.ok(canUseWarehouse(g));
 assert.equal(nearbyInteraction(g)?.type,'warehouse');
 Object.assign(g.player,room.exit);for(let i=0;i<20;i++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);
});
test('木材、备用弹药和种子往返守恒、减负且持久保存',()=>{
 const g=setup();g.progress.logistics.bagWood=8;g.progress.supplies.hand.heavy=12;g.progress.farm.seeds[0]=9;
 for(const [id,n,mass] of [['material:wood',8,.1],['ammo:heavy',12,1.1],['seed:0',9,.02]]){
  const before=catLoad(g).weight,snapshot=structuredClone(g.progress),result=transferWarehouse(g,'bag',id,n,'deposit');assert.ok(result.ok,result.message);assert.ok(catLoad(g).weight<before);g.progress=validateProgress(structuredClone(g.progress));assert.ok(transferWarehouse(g,'bag',id,n,'withdraw',true).ok);assert.equal(catLoad(g).weight,before);
  assert.equal(g.progress.wood,snapshot.wood);assert.deepEqual(g.progress.warehouse,snapshot.warehouse);
 }
});
test('附近车辆只装卸木材和弹药，远车、跨地图和维修车不可取货',()=>{
 const g=setup(),i=g.vehicle.index;g.progress.campParking.owned=[{hull:i,spot:null,mapId:'forest',x:WAREHOUSE.x,y:WAREHOUSE.y+80,hp:1,ammo:0}];g.progress.supplies.vehicles[i].shell=10;g.progress.logistics.builds[i].wood=8;
 assert.ok(warehouseVehicles(g).includes(i));const before=vehicleLoad(g,i).payload;assert.ok(transferWarehouse(g,i,'ammo:shell',10,'deposit').ok);assert.ok(vehicleLoad(g,i).payload<before);assert.equal(g.progress.supplies.hand.shell,0);assert.ok(transferWarehouse(g,i,'material:wood',8,'deposit').ok);assert.ok(transferWarehouse(g,i,'ammo:shell',4,'withdraw',true).ok);assert.equal(g.progress.supplies.hand.shell,0);
 assert.equal(transferWarehouse(g,i,'seed:0',1,'withdraw').ok,false);g.progress.campParking.owned[0].x+=500;assert.equal(warehouseVehicles(g).length,0);g.progress.campParking.owned[0].x-=500;g.progress.vehicleService[i]={phase:'repairing'};assert.equal(warehouseVehicles(g).length,0);
});
test('满载提示、上限、非法数量和保存失败均不吞货',()=>{
 const g=setup();g.progress.warehouse.ammo.heavy=1000;const preview=warehouseTransferPreview(g,'bag','ammo:heavy',1000,'withdraw');assert.ok(preview.needsConfirmation);assert.equal(transferWarehouse(g,'bag','ammo:heavy',1000,'withdraw').ok,false);assert.equal(g.progress.warehouse.ammo.heavy,1000);
 assert.ok(transferWarehouse(g,'bag','ammo:heavy',1000,'withdraw',true).ok);assert.ok(catLoad(g).overloaded);assert.ok(transferWarehouse(g,'bag','ammo:heavy',1000,'deposit').ok);assert.equal(catLoad(g).overloaded,false);
 g.progress.wood=RESOURCE_CAP;g.progress.logistics.bagWood=5;assert.equal(transferWarehouse(g,'bag','material:wood',1,'deposit').ok,false);
 for(const n of [0,-1,NaN,1.2,Infinity])assert.equal(transferWarehouse(g,'bag','material:wood',n,'deposit').ok,false);
 g.progress.wood=0;const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(transferWarehouse(g,'bag','material:wood',5,'deposit').ok,false);assert.deepEqual(g.progress,before);g.cottage={kind:'seed'};assert.equal(transferWarehouse(g,'bag','material:wood',1,'deposit').ok,false);
});

// 室外许可覆盖步行、骑乘和暂停，拒绝远程、跨地图、其他房屋及事件战斗。
test('室外打开不改坐标或驾驶，远处与其他场景不能存取',()=>{const g=setup(),position={x:g.player.x,y:g.player.y};g.vehicle.active=true;assert.ok(canUseWarehouse(g));g.state='paused';assert.ok(canUseWarehouse(g));assert.equal(g.vehicle.active,true);assert.deepEqual({x:g.player.x,y:g.player.y},position);g.player.x+=200;assert.equal(canUseWarehouse(g),false);Object.assign(g.player,position);g.mapId='jiuzhaigou';assert.equal(canUseWarehouse(g),false);g.mapId='forest';g.cottage={kind:'cottage'};assert.equal(canUseWarehouse(g),false);g.cottage=null;g.boss={};assert.equal(canUseWarehouse(g),false);g.boss=null;g.player.hp=0;assert.equal(canUseWarehouse(g),false);});
