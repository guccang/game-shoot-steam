// 主线资源回归：全容器统计、真实结算与交付、操作教学不能由库存代做。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,MAINLINE_SITES} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {taskResourceStock,taskCropStock} from '../src/progression/economy/task-resources.js';
import {mainlineConditionCost,mainlineResourceHint} from '../src/progression/story/mainline-cost.js';
import {mainlineCondition,mainlineSteps,mainlineObjective,updateMainline,completeMainline} from '../src/core/story/mainline-manager.js';
import {harvestBudget,harvestGuideHint} from '../src/core/farming/harvest-guide.js';
import {transferWarehouse} from '../src/core/inventory/warehouse.js';
import {updateWarehouseHarvest} from '../src/core/inventory/warehouse-harvest.js';
import {beginGardeningLesson} from '../src/progression/story/mainline-gardening.js';
import {transferCargo} from '../src/core/inventory/cargo.js';

// 清空前置修复阻挡，使用正式进度、真实仓库和持久化事务。
function scene(id='upgrade-harvest'){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 p.mainline.currentId=id;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';
 p.coins=p.wood=0;p.vehicleHulls[0]=1;p.vehicleIndex=0;beginGardeningLesson(p);
 const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=g.mainlinePersist=()=>true;Object.assign(g.player,{x:2600,y:1800});updateMainline(g,0);return g;
}

for(const task of MAINLINE_TASKS){
 test(task.id+' 的资源报价合计背包和自有货舱，实际升级仍需操作',()=>{
  const g=scene(task.id),p=g.progress,cost=mainlineConditionCost(p,task.goal);p.coins=cost.coins;p.materials={parts:cost.parts,crystal:cost.crystal,core:cost.core};p.logistics.bagWood=Math.floor(cost.wood/2);p.logistics.builds[0].wood=cost.wood-p.logistics.bagWood;
  const before=structuredClone(p),hint=mainlineResourceHint(p,task.goal);assert.doesNotMatch(hint,/还差/);assert.deepEqual(p,before);
  if(cost.wood){assert.match(hint,/已采齐/);assert.equal(p.wood,0);p.logistics.builds[0].wood--;assert.match(mainlineResourceHint(p,task.goal),/还差木头1/);}
 });
}

test('同品种作物跨背包和多个自有货舱合计，装卸和存档不重复累计',()=>{
 const g=scene(),p=g.progress;p.farm.inventory[0]=2;p.vehicleHulls[1]=1;p.logistics.builds[0].cargo[0]=3;p.logistics.builds[1].cargo[0]=4;p.logistics.builds[2].cargo[0]=99;
 assert.equal(taskResourceStock(p,'crop:0').total,9);assert.equal(taskCropStock(p).value,9*FARM_CROPS[0].value);
 assert.equal(mainlineCondition(g,{path:'progress.farm.inventory.0',min:9}),true);
 assert.ok(transferCargo(g,0,0,1,'load').ok);assert.equal(taskResourceStock(g.progress,'crop:0').total,9);
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(taskResourceStock(g.progress,'crop:0').total,9);
});

for(const id of ['neighbor-seeds','neighbor-seed-shop'])test(id+' 存仓种子计入完成度，取回后才可实际交付',()=>{
 const g=scene(id),p=g.progress,count=id==='neighbor-seeds'?1:2;p.mainline.gardening.seedDrops=1;p.mainline.gardening.purchased=2;p.warehouse.seeds[0]=count;
 const task=MAINLINE_TASKS.find(t=>t.id===id);assert.equal(mainlineCondition(g,task.goal),true);updateMainline(g,0);assert.equal(p.mainline.phase,'doing');
 assert.equal(mainlineSteps(g)[1].progress,count+'/'+count);assert.equal(mainlineSteps(g).at(-1).operation.type,'warehouse');assert.equal(mainlineObjective(g).key,'warehouseEntry');
 Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+60});g.livingPersist=()=>false;assert.equal(transferWarehouse(g,'bag','seed:0',1,'withdraw').ok,false);assert.equal(mainlineSteps(g).at(-1).done,false);
 g.livingPersist=()=>true;assert.ok(transferWarehouse(g,'bag','seed:0',1,'withdraw').ok);assert.equal(taskResourceStock(g.progress,'seed:0').total,count);updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');
 Object.assign(g.player,MAINLINE_SITES[task.site]);assert.ok(completeMainline(g));assert.equal(g.progress.farm.seeds[0],task.seedReward?.count||0);assert.equal(g.progress.warehouse.seeds[0],count-1);
});

test('载具里的收成足够时引导取车和结算，不能未出售就消费或跳过收获教学',()=>{
 const g=scene(),task=MAINLINE_TASKS.find(t=>t.id==='upgrade-harvest'),cost=harvestBudget(g.progress,task).cost,count=Math.ceil(cost/FARM_CROPS[0].value);
 g.progress.logistics.builds[0].cargo[0]=count;g.progress.mainline.gardening.harvested=1;g.progress.campParking.owned=[{hull:0,mapId:'jiuzhaigou',x:4000,y:2000,spot:null,hp:100}];
 assert.equal(harvestBudget(g.progress,task).missing,0);assert.equal(harvestBudget(g.progress,task).ready,false);assert.match(harvestGuideHint(g,task),/收成已够/);assert.doesNotMatch(harvestGuideHint(g,task),/还差/);assert.equal(mainlineObjective(g).site.mapId,'jiuzhaigou');assert.match(mainlineObjective(g).label,/取回/);
 Object.assign(g.progress.campParking.owned[0],{mapId:'forest',x:WAREHOUSE.x,y:WAREHOUSE.y+60});Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+60});assert.match(mainlineObjective(g).label,/自动结算/);
 g.livingPersist=()=>false;updateWarehouseHarvest(g,.1);assert.equal(g.progress.coins,0);assert.equal(taskCropStock(g.progress).total,count);
 g.livingPersist=()=>true;g.warehouseAutoHarvest=null;updateWarehouseHarvest(g,.1);assert.equal(g.progress.coins,count*FARM_CROPS[0].value);assert.equal(taskCropStock(g.progress).total,0);assert.equal(harvestBudget(g.progress,task).ready,true);
 updateMainline(g,0);assert.equal(g.progress.mainline.currentId,'pistol-upgrade');
});

test('仅部分收成时缺口扣除所有载具，余额已够时不被无关作物强制要求出售',()=>{
 const g=scene(),task=MAINLINE_TASKS.find(t=>t.id==='upgrade-harvest');g.progress.farm.inventory[0]=1;const cost=harvestBudget(g.progress,task).cost;
 assert.equal(harvestBudget(g.progress,task).missing,Math.max(0,cost-FARM_CROPS[0].value));
 g.progress.coins=cost;assert.equal(harvestBudget(g.progress,task).ready,false);assert.doesNotMatch(harvestGuideHint(g,task),/结算|出售|还差/);
 g.progress.mainline.gardening.harvested=1;assert.equal(harvestBudget(g.progress,task).ready,true);
});

test('武器购买任务已有车载木头时指向取货，实际购买条件保持未完成',()=>{
 const g=scene('buy-shotgun'),task=MAINLINE_TASKS.find(t=>t.id==='buy-shotgun'),cost=mainlineConditionCost(g.progress,task.goal);
 g.progress.coins=cost.coins;g.progress.materials={parts:999,crystal:999,core:999};g.progress.logistics.builds[0].wood=cost.wood;g.progress.campParking.owned=[{hull:0,mapId:'forest',x:4000,y:2000,spot:null,hp:100}];
 assert.ok(cost.wood>0);assert.match(mainlineSteps(g)[0].hint,/已采齐/);assert.match(mainlineObjective(g).label,/取回/);assert.equal(mainlineCondition(g,task.goal),false);
});

test('购弹、装卸和购种教学不因库存充足被自动完成',()=>{
 for(const id of ['supply-ammo','warehouse-lesson','vehicle-weight','neighbor-seed-shop']){const g=scene(id);g.progress.warehouse.ammo.light=999;g.progress.supplies.hand.light=999;g.progress.logistics.builds[0].wood=100;g.progress.warehouse.seeds[0]=100;assert.equal(mainlineCondition(g,MAINLINE_TASKS.find(t=>t.id===id).goal),false,id);}
});


test('购买任务的车载收成抵扣收集缺口，但未兑换金币仍不能完成购买',()=>{
 const g=scene('buy-shotgun'),task=MAINLINE_TASKS.find(t=>t.id==='buy-shotgun'),cost=mainlineConditionCost(g.progress,task.goal);
 g.progress.wood=cost.wood;g.progress.materials={parts:999,crystal:999,core:999};g.progress.logistics.builds[0].cargo[0]=Math.ceil(cost.coins/FARM_CROPS[0].value);
 assert.doesNotMatch(mainlineResourceHint(g.progress,task.goal),/还差/);assert.match(mainlineResourceHint(g.progress,task.goal),/收成已够/);assert.equal(mainlineSteps(g)[0].resourceDelivery,'crops');assert.equal(mainlineCondition(g,task.goal),false);assert.equal(g.progress.coins,0);
 g.progress.materials.parts=0;if(cost.parts>0)assert.match(mainlineResourceHint(g.progress,task.goal),/还差机械零件/);
});

test('待交付时再次存入种子，返回取货步骤且不误报需重新购买',()=>{
 const g=scene('neighbor-seeds');g.progress.mainline.gardening.seedDrops=1;g.progress.farm.seeds[0]=1;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');
 Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+60});assert.ok(transferWarehouse(g,'bag','seed:0',1,'deposit').ok);updateMainline(g,0);
 assert.equal(g.progress.mainline.phase,'doing');assert.equal(mainlineSteps(g)[1].progress,'1/1');assert.equal(mainlineObjective(g).key,'warehouseEntry');
});
