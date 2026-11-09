// 工业链使用正式进屋、停车与原子交易，背包和远处车辆不能跨空间扣料。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {CAMP_PLOTS} from '../src/config/camp-land.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {ERA_VEHICLES} from '../src/config/vehicle-eras.js';
import {COLLECTED_VEHICLES,VEHICLE_DISPLAY_ORDER} from '../src/config/vehicles.js';
import {industryDoor,INDUSTRY_SITES,industryVehicles,industryMaterialSources,canUseIndustry,transferIndustry,startIndustry,updateIndustry} from '../src/core/industry/industry.js';
import {transferWarehouse} from '../src/core/inventory/warehouse.js';
import {creditOre} from '../src/core/mining/mine-transactions.js';
import {equipmentRequirements,equipmentRecipe,payEquipment} from '../src/progression/workshop/equipment-goals.js';
import {industryStore,industryStock} from '../src/progression/industry/industry.js';
import {INDUSTRY_CAP} from '../src/config/industry.js';
import {enterWorkshop,leaveCottage,updateCottage} from '../src/core/home/cottage.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
// 隔离存档完成教程，正式持久化回调可注入失败。
function scene(){const p=freshProgress();p.campLand.owned=CAMP_PLOTS.map(s=>s.id);p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(r=>r.id);p.wood=1000;p.vehicleHulls[13]=1;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.livingPersist=()=>true;Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+40});return g;}
// 只准备真实停靠记录，工厂仍按门外坐标核验归属。
function park(g,hull,site){g.progress.vehicleHulls[hull]=1;g.progress.campParking.owned=g.progress.campParking.owned.filter(r=>r.hull!==hull);g.progress.campParking.owned.push({hull,spot:null,mapId:'forest',x:site.x+80,y:site.y+60,hp:1,ammo:0});}
// 通过正式入口进入当前工厂；不伪造房间局部坐标作为车的位置。
function at(g,id){g.cottage=null;g.cottageDoorLatch=false;Object.assign(g.player,industryDoor(INDUSTRY_SITES[id]),{vx:0,vy:0});assert.ok(enterWorkshop(g,id));}
// 回仓库前真正出门，车辆位置按运输后的停靠记录更新。
function home(g){if(g.cottage)assert.ok(leaveCottage(g));Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+40});park(g,13,WAREHOUSE);}

test('无停靠车辆时两厂全部配方均可直接扣小屋仓库原料',async()=>{
 const {INDUSTRY_RECIPES}=await import('../src/config/industry.js');
 for(const r of INDUSTRY_RECIPES){
  const g=scene();at(g,r.site);g.progress.wood=0;
  for(const [key,n] of Object.entries(r.input)){const [stock,k]=industryStore(g.progress,key,'home');stock[k]=n*2;assert.equal(industryMaterialSources(g,r.site,key).home,n*2);}
  assert.deepEqual(industryVehicles(g),[]);const result=startIndustry(g,r.site,r.id,2,1000);assert.ok(result.ok,result.message);
  for(const key of Object.keys(r.input)){const [stock,k]=industryStore(g.progress,key,'home');assert.equal(stock[k],0,r.id+':'+key);}
  assert.ok(updateIndustry(g,1000+r.seconds*2*1000));assert.equal(industryStore(g.progress,r.output,'home')[0][industryStore(g.progress,r.output,'home')[1]],r.count*2);assert.equal(g.progress.industry.sites[r.site].output[r.output],0);
 }
});

test('厂内、近车、小屋仓库依次合并取料，远车和背包不参与',()=>{
 const g=scene();park(g,13,INDUSTRY_SITES.refinery);park(g,19,INDUSTRY_SITES.factory);at(g,'refinery');
 g.progress.industry.sites.refinery.input.rawCopper=1;g.progress.industry.vehicles[13]=industryStock({rawCopper:2});g.progress.industry.vehicles[19]=industryStock({rawCopper:20});g.progress.mining.bagOre.copper=30;g.progress.industry.raw.copper=10;g.progress.logistics.builds[13].wood=1;g.progress.wood=5;
 assert.deepEqual(industryMaterialSources(g,'refinery','rawCopper'),{local:1,cargo:2,home:10,total:13});assert.ok(startIndustry(g,'refinery','refine-copper',2,1000).ok);
 assert.equal(g.progress.industry.sites.refinery.input.rawCopper,0);assert.equal(g.progress.industry.vehicles[13].rawCopper,0);assert.equal(g.progress.industry.raw.copper,9);assert.equal(g.progress.wood,4);assert.equal(g.progress.logistics.builds[13].wood,0);assert.equal(g.progress.industry.vehicles[19].rawCopper,20);assert.equal(g.progress.mining.bagOre.copper,30);
});

test('合计缺料或保存失败保留所有来源，不能先扣原矿再因缺木材损失',()=>{
 const g=scene();at(g,'refinery');g.progress.industry.raw.copper=4;g.progress.wood=1;
 let before=JSON.stringify(g.progress),result=startIndustry(g,'refinery','refine-copper',2,1000);assert.equal(result.ok,false);assert.match(result.message,/木材需要 2，合计可用 1，还缺 1/);assert.equal(JSON.stringify(g.progress),before);
 g.progress.wood=2;before=JSON.stringify(g.progress);g.livingPersist=()=>false;assert.equal(startIndustry(g,'refinery','refine-copper',2,1000).ok,false);assert.equal(JSON.stringify(g.progress),before);
 g.livingPersist=()=>true;assert.ok(startIndustry(g,'refinery','refine-copper',2,1000).ok);g.progress=validateProgress(structuredClone(g.progress));assert.equal(startIndustry(g,'refinery','refine-copper',2,1000).ok,false);assert.equal(g.progress.industry.raw.copper,0);assert.equal(g.progress.wood,0);assert.ok(updateIndustry(g,7000));assert.equal(updateIndustry(g,8000),false);assert.equal(g.progress.materials.copper,2);assert.equal(g.progress.industry.sites.refinery.output.copper,0);
});

test('小屋供料不绕过进厂权限，原料投入保持规则且成品自动入库',()=>{
 const g=scene();g.progress.industry.raw.copper=10;assert.equal(startIndustry(g,'refinery','refine-copper').ok,false);at(g,'refinery');assert.equal(startIndustry(g,'factory','make-farmParts').ok,false);
 const before=JSON.stringify(g.progress);assert.equal(transferIndustry(g,'refinery','rawCopper',2,'deposit').ok,false);assert.equal(JSON.stringify(g.progress),before);assert.ok(startIndustry(g,'refinery','refine-copper',1,1000).ok);assert.ok(updateIndustry(g,4000));assert.equal(transferIndustry(g,'refinery','copper',1,'collect').ok,false);assert.equal(g.progress.materials.copper,1);assert.equal(g.progress.industry.sites.refinery.output.copper,0);
});

test('仓库原矿装车提炼，产物自动入库供加工与枪械制造',()=>{
 const g=scene();g.progress.wood=2000;park(g,13,WAREHOUSE);creditOre(g.progress,'copper',8);assert.equal(g.progress.materials.copper,0);
 assert.ok(transferWarehouse(g,13,'industry:rawCopper',8,'withdraw').ok);assert.ok(transferWarehouse(g,13,'material:wood',6,'withdraw').ok);
 park(g,13,INDUSTRY_SITES.refinery);at(g,'refinery');assert.deepEqual(industryVehicles(g),[13]);assert.ok(startIndustry(g,'refinery','refine-copper',4,1000).ok);assert.equal(g.progress.industry.vehicles[13].rawCopper,0);assert.equal(g.progress.logistics.builds[13].wood,2);
 assert.equal(updateIndustry(g,12999),false);assert.ok(updateIndustry(g,13000));assert.equal(updateIndustry(g,14000),false);assert.equal(g.progress.materials.copper,4);assert.equal(g.progress.industry.sites.refinery.output.copper,0);assert.equal(g.progress.industry.bag.copper,0);
 park(g,13,INDUSTRY_SITES.factory);at(g,'factory');assert.ok(startIndustry(g,'factory','make-copperGun',2,15000).ok);assert.ok(updateIndustry(g,23000));assert.equal(g.progress.materials.copperGun,2);assert.equal(equipmentRequirements(g.progress,'weapons',1).find(r=>r.key==='copperGun').have,2);
 home(g);g.progress.coins=g.progress.wood=999999;g.progress.materials.parts=g.progress.materials.crystal=g.progress.materials.core=999;assert.ok(payEquipment(g.progress,'weapons',1));assert.equal(g.progress.materials.copperGun,0);
});

test('只汇总本厂实际停靠车辆，背包、远车、驾驶中、异地图和维修车均排除',()=>{
 const g=scene();g.progress.mining.bagOre.copper=99;g.progress.logistics.bagWood=99;at(g,'refinery');assert.deepEqual(industryVehicles(g),[]);assert.equal(startIndustry(g,'refinery','refine-copper',1).ok,false);
 park(g,13,INDUSTRY_SITES.factory);assert.deepEqual(industryVehicles(g),[]);park(g,13,INDUSTRY_SITES.refinery);assert.deepEqual(industryVehicles(g),[13]);g.progress.campParking.owned[0].mapId='jiuzhaigou';assert.deepEqual(industryVehicles(g),[]);g.progress.campParking.owned[0].mapId='forest';g.progress.vehicleService[13]={phase:'repairing'};assert.deepEqual(industryVehicles(g),[]);g.progress.vehicleService[13]=null;g.vehicle=g.vehicles[13];g.vehicle.active=true;assert.deepEqual(industryVehicles(g),[]);g.vehicle.active=false;
 assert.equal(startIndustry(g,'factory','make-copperGun',1).ok,false);g.cottage=null;Object.assign(g.player,industryDoor(INDUSTRY_SITES.refinery));assert.equal(canUseIndustry(g,'refinery'),false);assert.equal(startIndustry(g,'refinery','refine-copper',1).ok,false);
});

test('多车拆分原料扣除、缺料和保存失败回滚，旧厂内原料继续可用',()=>{
 const g=scene();g.progress.wood=0;park(g,13,INDUSTRY_SITES.refinery);park(g,19,{...INDUSTRY_SITES.refinery,x:INDUSTRY_SITES.refinery.x+20});at(g,'refinery');
 g.progress.industry.vehicles[13]=industryStock({rawCopper:1});g.progress.industry.vehicles[19]=industryStock({rawCopper:2});g.progress.logistics.builds[19].wood=1;g.progress.industry.sites.refinery.input.rawCopper=1;
 for(const n of [0,-1,1.5,NaN,100])assert.equal(startIndustry(g,'refinery','refine-copper',n).ok,false);
 let before=JSON.stringify(g.progress);assert.equal(startIndustry(g,'refinery','refine-copper',2).ok,false);assert.equal(JSON.stringify(g.progress),before);
 g.progress.logistics.builds[19].wood=2;before=JSON.stringify(g.progress);g.livingPersist=()=>false;assert.equal(startIndustry(g,'refinery','refine-copper',2).ok,false);assert.equal(JSON.stringify(g.progress),before);g.livingPersist=()=>true;assert.ok(startIndustry(g,'refinery','refine-copper',2,1000).ok);
 assert.equal(g.progress.industry.vehicles[13].rawCopper,0);assert.equal(g.progress.industry.vehicles[19].rawCopper,0);assert.equal(g.progress.logistics.builds[19].wood,0);assert.equal(g.progress.industry.sites.refinery.input.rawCopper,0);
 g.progress=validateProgress(structuredClone(g.progress));g.livingPersist=()=>false;assert.equal(updateIndustry(g,7000),false);assert.ok(g.progress.industry.sites.refinery.job);g.livingPersist=()=>true;assert.ok(updateIndustry(g,10000));assert.equal(g.progress.materials.copper,2);assert.equal(g.progress.industry.sites.refinery.output.copper,0);
});

test('成品按停靠车辆空余载荷分装，装不下或保存失败完全保留',()=>{
 const g=scene();park(g,19,INDUSTRY_SITES.refinery);at(g,'refinery');const cap=vehicleLoad(g,19).capacity;g.progress.logistics.builds[19].wood=Math.floor((cap-vehicleLoad(g,19).payload-.6)*10);g.progress.industry.sites.refinery.output.iron=4;
 const before=JSON.stringify(g.progress);assert.equal(transferIndustry(g,'refinery','iron',4,'collect').ok,false);assert.equal(JSON.stringify(g.progress),before);
 park(g,13,{...INDUSTRY_SITES.refinery,x:INDUSTRY_SITES.refinery.x+20});g.livingPersist=()=>false;const snapshot=JSON.stringify(g.progress);assert.equal(transferIndustry(g,'refinery','iron',4,'collect').ok,false);assert.equal(JSON.stringify(g.progress),snapshot);g.livingPersist=()=>true;assert.ok(transferIndustry(g,'refinery','iron',4,'collect').ok);assert.equal(g.progress.industry.vehicles[19].iron,1);assert.equal(g.progress.industry.vehicles[13].iron,3);assert.equal(g.progress.industry.sites.refinery.output.iron,0);assert.equal(g.progress.industry.bag.iron,0);
});

test('两厂复用门口候停、管理员、房间碰撞和正常出门，不在室外打开生产',async()=>{
 const {shopkeeperApproach,requestShopkeeperService}=await import('../src/core/workshop/workshop-display-entry.js'),{interiorLayout,interiorFurniture}=await import('../src/config/workshop-interiors.js'),{CLICK_BUILDINGS}=await import('../src/config/scene-approach.js');const g=scene();
 for(const id of ['refinery','factory']){g.cottage=null;g.cottageDoorLatch=false;Object.assign(g.player,industryDoor(INDUSTRY_SITES[id]),{vx:0,vy:0});for(let n=0;n<21;n++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage.kind,id);assert.ok(CLICK_BUILDINGS.some(b=>b.id===id));assert.ok(interiorFurniture(g).some(f=>f.type==='industry-machine'));Object.assign(g.player,shopkeeperApproach(g.cottage));assert.equal(requestShopkeeperService(g).kind,id);Object.assign(g.player,interiorLayout(g.cottage).exit);for(let n=0;n<21;n++)updateCottage(g,.05,{x:0,y:0});assert.equal(g.cottage,null);assert.equal(canUseIndustry(g,id),false);}
});

test('所有工业配方及农具使用真实车载原料，入库启用成品并保留存档',async()=>{
 const {INDUSTRY_RECIPES}=await import('../src/config/industry.js'),{farmToolReady}=await import('../src/config/farm-tools.js');const g=scene();
 for(const r of INDUSTRY_RECIPES){park(g,13,INDUSTRY_SITES[r.site]);at(g,r.site);for(const [k,n] of Object.entries(r.input)){const [stock,key]=industryStore(g.progress,k,13,true);stock[key]=n;}assert.ok(startIndustry(g,r.site,r.id,1,1000).ok,r.id);assert.ok(updateIndustry(g,1000+r.seconds*1000));assert.ok(industryStore(g.progress,r.output,'home')[0][industryStore(g.progress,r.output,'home')[1]]>=1);assert.equal(g.progress.industry.sites[r.site].output[r.output],0);}
 assert.equal(farmToolReady(g.progress,'seeder'),true);home(g);assert.equal(farmToolReady(validateProgress(g.progress),'seeder'),true);
});

test('车型配方保留单金属要求，旧运输车归并货物后读档不重复迁移',()=>{
 const p=freshProgress();assert.equal(equipmentRecipe('vehicle',0,p).ironVehicle,6);assert.equal(equipmentRecipe('vehicle',6,p).rareVehicle,24);assert.deepEqual(VEHICLE_DISPLAY_ORDER.filter(i=>i>=11).map(i=>COLLECTED_VEHICLES[i].id),['wood-bicycle','wood-wagon']);
 const old=ERA_VEHICLES.find(v=>v.id==='steam-freighter').index;p.vehicleHulls[old]=1;p.vehicleHulls[13]=1;p.vehicleIndex=old;p.logistics.builds[old].wood=25;p.logistics.builds[13].wood=6;p.logistics.builds[old].cargo[0]=3;p.supplies.vehicles[old].light=50;
 const q=validateProgress(p);assert.equal(q.vehicleHulls[old],0);assert.equal(q.vehicleIndex,13);assert.equal(q.logistics.builds[13].wood,31);assert.equal(q.logistics.builds[13].cargo[0],3);assert.equal(q.supplies.vehicles[13].light,50);assert.equal(validateProgress(q).logistics.builds[13].wood,31);
 for(const v of ERA_VEHICLES.filter(v=>v.retired))assert.equal(equipmentRecipe('vehicle',v.index,p),null);
});

test('双厂同时到期和旧成品自动入小屋，离线读档后不重复到账',()=>{
 const g=scene();g.cottage=null;g.state='paused';g.progress.industry.sites.refinery.job={recipe:'refine-copper',count:3,readyAt:1000};g.progress.industry.sites.factory.job={recipe:'make-farmParts',count:4,readyAt:1000};
 g.progress.industry.sites.refinery.output.iron=5;g.progress.industry.sites.factory.output.seederKit=2;let saves=0;g.livingPersist=()=>{saves++;return true;};
 assert.ok(updateIndustry(g,2000));assert.equal(saves,1);assert.equal(g.progress.materials.copper,3);assert.equal(g.progress.materials.farmParts,4);assert.equal(g.progress.materials.iron,5);assert.equal(g.progress.materials.seederKit,2);
 assert.ok(Object.values(g.progress.industry.sites).every(s=>!s.job&&Object.values(s.output).every(n=>n===0)));
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(updateIndustry(g,999999),false);assert.equal(saves,1);assert.equal(g.progress.materials.copper,3);
});

test('自动入库保存失败或异常原子回滚，到期任务与旧成品可重试',()=>{
 for(const persist of [()=>false,()=>{throw Error('保存失败');}]){
  const g=scene();g.progress.industry.sites.refinery.job={recipe:'refine-copper',count:2,readyAt:1000};g.progress.industry.sites.factory.output.ironGun=3;g.livingPersist=persist;
  const before=structuredClone(g.progress);assert.equal(updateIndustry(g,2000),false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.equal(updateIndustry(g,3000),false);assert.ok(updateIndustry(g,4000));assert.equal(g.progress.materials.copper,2);assert.equal(g.progress.materials.ironGun,3);assert.equal(updateIndustry(g,5000),false);
 }
});

test('小屋满额时保留剩余产物，腾出空间后自动补入且新批次不能超额预订',()=>{
 const g=scene();at(g,'refinery');g.progress.materials.copper=INDUSTRY_CAP-1;g.progress.industry.sites.refinery.output.copper=3;
 assert.ok(updateIndustry(g,1000));assert.equal(g.progress.materials.copper,INDUSTRY_CAP);assert.equal(g.progress.industry.sites.refinery.output.copper,2);assert.equal(startIndustry(g,'refinery','refine-copper',1,1000).ok,false);
 g.progress.materials.copper-=2;assert.ok(updateIndustry(g,2000));assert.equal(g.progress.materials.copper,INDUSTRY_CAP);assert.equal(g.progress.industry.sites.refinery.output.copper,0);
});

test('生产中小屋被填满仍保留本批产量，双端均满时保留待完成任务',()=>{
 const g=scene();g.progress.materials.copper=INDUSTRY_CAP;g.progress.industry.sites.refinery.job={recipe:'refine-copper',count:2,readyAt:1000};
 assert.ok(updateIndustry(g,2000));assert.equal(g.progress.materials.copper,INDUSTRY_CAP);assert.equal(g.progress.industry.sites.refinery.output.copper,2);assert.equal(g.progress.industry.sites.refinery.job,null);
 g.progress.industry.sites.refinery.output.copper=INDUSTRY_CAP;g.progress.industry.sites.refinery.job={recipe:'refine-copper',count:2,readyAt:1000};assert.equal(updateIndustry(g,3000),false);assert.ok(g.progress.industry.sites.refinery.job);
 g.progress.materials.copper-=4;assert.ok(updateIndustry(g,5000));assert.equal(g.progress.materials.copper,INDUSTRY_CAP);assert.equal(g.progress.industry.sites.refinery.output.copper,INDUSTRY_CAP-2);assert.equal(g.progress.industry.sites.refinery.job,null);
});

test('点厂房主动走近不会被门前货车抢上车，出门后仍能正常登车',async()=>{
 const {approachBuilding}=await import('../src/core/navigation/scene-approach.js');const g=scene(),s=INDUSTRY_SITES.refinery;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;g.parkingVisitors=[];park(g,13,s);Object.assign(g.player,{x:s.x,y:s.y+115,vx:0,vy:0});assert.ok(approachBuilding(g,'refinery'));
 for(let i=0;i<200&&!g.cottage;i++)g.update(.05,{x:0,y:0});assert.equal(g.cottage?.kind,'refinery');assert.equal(g.vehicle.active,false);assert.ok(leaveCottage(g));const car=g.progress.campParking.owned.find(r=>r.hull===13);Object.assign(g.player,{x:car.x,y:car.y,vx:0,vy:0});for(let i=0;i<24;i++)g.update(.05,{x:0,y:0});assert.equal(g.vehicle.index,13);assert.equal(g.vehicle.active,true);
});
