// 鱼获收纳事务：独立容量、附近载具、保存回滚、出售和旧档守恒。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {FISH_SPECIES} from '../src/config/outdoors.js';
import {FISHING_CONTAINERS} from '../src/config/fishing-tackle.js';
import {catLoad,vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {fishStoreStats} from '../src/progression/fishing/fish-storage.js';
import {planFishStorage,nearbyFishVehicles} from '../src/core/fishing/fish-storage.js';
import {finishFishing,buyOutdoorGear,equipFishingTackle,sellOutdoorFish} from '../src/core/activities/outdoors.js';
import {transferInventoryItem} from '../src/core/inventory/inventory-transfer.js';
// 正式车队与背包，只准备现场和待确认鱼获，不替代存放与保存实现。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(0);p.vehicleHulls[5]=p.vehicleHulls[13]=1;p.vehicleIndex=5;p.coins=5000;const g=new Game(p,()=>.5);g.state='paused';g.vehicle.active=false;g.livingPersist=()=>true;g.enemies=[];g.boss=null;g.mainlineSpeech=null;Object.assign(g.player,{x:900,y:800});g.progress.campParking.owned=[{hull:5,spot:null,mapId:'forest',x:940,y:800,hp:1,ammo:0},{hull:13,spot:null,mapId:'forest',x:980,y:800,hp:1,ammo:0}];g.fishing={phase:'landed',species:0,size:22};return g;}

test('未装备容器先放背包，背包装不下时放最近且有余量的车',()=>{
 const g=scene(),fish=FISH_SPECIES[0];assert.equal(finishFishing(g,true).storage,'bag');assert.equal(g.progress.outdoors.fish[fish.id],1);
 g.fishing={phase:'landed',species:0,size:24};g.progress.logistics.bagWood=10000;const before=vehicleLoad(g,5,{driver:false}).payload;
 assert.equal(finishFishing(g,true).storage,5);assert.equal(g.progress.shopStock[5]['fish:'+fish.id],1);assert.ok(Math.abs(vehicleLoad(g,5,{driver:false}).payload-before-fish.mass)<1e-6);
 g.fishing={phase:'landed',species:0,size:25};g.progress.logistics.builds[5].wood=100000;assert.equal(finishFishing(g,true).storage,13);assert.equal(g.progress.outdoors.collection[fish.id].count,3);
});

test('两类容器使用独立容量，指定渔网可覆盖默认鱼桶，装满自动回落',()=>{
 const g=scene(),fish=FISH_SPECIES[0];g.progress.outdoors.containers={bucket:true,net:true};g.progress.outdoors.selectedContainer='bucket';g.progress.logistics.bagWood=10000;const weight=catLoad(g).weight;
 assert.equal(finishFishing(g,true).storage,'bucket');assert.equal(catLoad(g).weight,weight);assert.equal(g.progress.outdoors.fishStores.bucket[fish.id],1);
 g.fishing={phase:'landed',species:0,size:23};assert.equal(finishFishing(g,true,'net').storage,'net');assert.equal(g.progress.outdoors.fishStores.net[fish.id],1);
 g.progress.outdoors.fishStores.bucket[fish.id]=Math.min(60,Math.floor(FISHING_CONTAINERS.bucket.capacity/fish.mass));g.fishing={phase:'landed',species:0,size:24};assert.equal(finishFishing(g,true).storage,5);
 const restored=validateProgress(structuredClone(g.progress));assert.deepEqual(restored.outdoors.fishStores,g.progress.outdoors.fishStores);assert.deepEqual(validateProgress(restored),restored);
});

test('鱼获重量超过容器剩余容量时拒绝，数量未满也不能超装',()=>{
 const g=scene(),fish=FISH_SPECIES.find(f=>f.mass>1.1&&f.mass<5);g.progress.outdoors.containers={bucket:true,net:true};
 for(const id of ['bucket','net']){const count=Math.floor(FISHING_CONTAINERS[id].capacity/fish.mass);assert.ok(count<60);g.progress.outdoors.fishStores[id][fish.id]=count;const before=structuredClone(g.progress);assert.equal(planFishStorage(g,fish.id,id).ok,false);assert.deepEqual(g.progress,before);g.progress.outdoors.fishStores[id][fish.id]--;assert.equal(planFishStorage(g,fish.id,id).ok,true);}
});

test('远处、其他地图、地下、维修及无真实停车记录的车不能隔空收鱼',()=>{
 for(const mode of ['far','map','mine','repair','missing']){const g=scene();g.progress.logistics.bagWood=10000;
  if(mode==='far')g.progress.campParking.owned.forEach(v=>v.x+=1000);
  if(mode==='map')g.progress.campParking.owned.forEach(v=>v.mapId='jiuzhaigou');
  if(mode==='mine')g.cottage={kind:'mine',depth:2};
  if(mode==='repair')for(const i of [5,13])g.progress.vehicleService[i]={phase:'repairing'};
  if(mode==='missing')g.progress.campParking.owned=[];
  assert.deepEqual(nearbyFishVehicles(g),[],mode);const before=JSON.stringify(g.progress);assert.equal(finishFishing(g,true).ok,false,mode);assert.equal(g.fishing.phase,'landed');assert.equal(JSON.stringify(g.progress),before);
 }
});

test('预览不改库存，保存失败不丢鱼不登记，可重试一次或放生',()=>{
 for(const destination of ['bucket','net','bag','vehicle']){const g=scene();g.progress.outdoors.containers={bucket:true,net:true};const before=structuredClone(g.progress);
  assert.ok(planFishStorage(g,'crucian',destination).ok);assert.deepEqual(g.progress,before);g.livingPersist=()=>false;assert.equal(finishFishing(g,true,destination).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.fishing.phase,'landed');
  g.livingPersist=()=>true;assert.ok(finishFishing(g,true,destination).ok);assert.equal(g.progress.outdoors.caught,1);assert.equal(finishFishing(g,true,destination).ok,false);
 }
 const g=scene();g.progress.logistics.bagWood=10000;g.progress.campParking.owned=[];assert.ok(finishFishing(g,false).ok);assert.equal(g.progress.outdoors.caught,0);
});

test('鱼桶渔网可采购选用，空容器双向装卸，装有鱼时不分离库存',()=>{
 const g=scene();g.fishing=null;g.cottage={kind:'outdoor',outside:{x:7000,y:7000}};const weight=catLoad(g).weight;
 for(const id of ['bucket','net']){assert.ok(buyOutdoorGear(g,id).ok);assert.ok(g.progress.outdoors.containers[id]);assert.equal(buyOutdoorGear(g,id).ok,false);assert.ok(equipFishingTackle(g,'container',id).ok);}
 assert.ok(Math.abs(catLoad(g).weight-weight-1.6)<1e-6);assert.equal(g.progress.outdoors.selectedContainer,'net');g.cottage=null;
 assert.ok(transferInventoryItem(g,'outdoor:bucket',5,1,'load').ok);g.progress=validateProgress(g.progress);assert.equal(g.progress.outdoors.containers.bucket,false);assert.ok(transferInventoryItem(g,'outdoor:bucket',5,1,'unload').ok);g.progress=validateProgress(g.progress);assert.equal(g.progress.outdoors.containers.bucket,true);
 g.progress.outdoors.fishStores.bucket.crucian=1;assert.equal(transferInventoryItem(g,'outdoor:bucket',5,1,'load').ok,false);
});

test('出售背包容器及店旁载具鱼获，保留远车与收藏；失败不扣库存',()=>{
 const g=scene(),fish=FISH_SPECIES[0];g.fishing=null;g.cottage={kind:'outdoor',outside:{x:900,y:800}};g.progress.outdoors.containers={bucket:true,net:true};g.progress.outdoors.fish.crucian=1;g.progress.outdoors.fishStores.bucket.crucian=2;g.progress.outdoors.fishStores.net.crucian=3;g.progress.shopStock[5]={'fish:crucian':4};g.progress.shopStock[13]={'fish:crucian':5};g.progress.campParking.owned[1].x=2000;g.progress.outdoors.collection.crucian.count=15;
 const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(sellOutdoorFish(g).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(sellOutdoorFish(g).ok);assert.equal(g.progress.coins-before.coins,10*fish.coins);assert.equal(g.progress.shopStock[13]['fish:crucian'],5);assert.equal(fishStoreStats(g.progress.outdoors.fishStores.bucket).count,0);assert.equal(g.progress.outdoors.collection.crucian.count,15);
});
