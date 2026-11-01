// 后勤主线使用正式交易、仓库、清理和维修入口验证，不用直接置位冒充真实操作。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {LOGISTICS_LESSONS,inspectLogisticsLesson} from '../src/progression/mainline-logistics.js';
import {mainlineCondition,mainlineTask,mainlineObjective,mainlineAction,updateMainline,completeMainline} from '../src/core/mainline-manager.js';
import {tradeSupply} from '../src/core/supplies.js';
import {transferWarehouse,warehouseTransferPreview,updateWarehouseWood} from '../src/core/warehouse.js';
import {discardLoad} from '../src/core/load-cleanup.js';
import {requestVehicleRepair,updateVehicleRepair} from '../src/core/vehicle-repair.js';
import {REPAIR_CENTER} from '../src/config/vehicle-repair.js';
import {blocked} from '../src/physics/motion.js';

// 只准备已修复营地、当前任务与基础车队，操作仍走正式业务函数。
function scene(id){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.currentId=id;p.mainline.phase='doing';
 p.vehicleHulls[0]=1;p.vehicleIndex=0;p.coins=1000;p.wood=100;p.weapons[0]=1;p.weapon=0;
 const g=new Game(p,()=>.4);g.state='playing';g.livingPersist=g.mainlinePersist=()=>true;g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.progress.campParking.owned=[];g.vehicle.active=false;return g;
}
// 仓库和维修测试把车辆留在正式玩家位置，避免伪造远程装卸权限。
function warehouse(g){Object.assign(g.player,MAINLINE_SITES.warehouseEntry);g.cottage=null;}

test('六项教学按外出、存储、购车和巡护顺序插入，入口可通行',()=>{
 const ids=[...new Set(Object.values(LOGISTICS_LESSONS))];assert.equal(ids.length,6);
 for(const [before,after] of [['first-map','supply-ammo'],['supply-ammo','neighbor-seeds'],['first-farm','warehouse-lesson'],['warehouse-lesson','bag-cleanup'],['first-vehicle','vehicle-weight'],['vehicle-weight','cargo-cleanup'],['pine-patrol','repair-center']])assert.ok(MAINLINE_IDS.indexOf(before)<MAINLINE_IDS.indexOf(after));
 const g=scene('supply-ammo');for(const id of ['warehouseEntry','ammoEntry','repairEntry']){const s=MAINLINE_SITES[id];assert.equal(blocked(s.x,s.y,12,g.trees,{mapId:'forest',livingCollision:true}),false,id);}
 for(const t of MAINLINE_TASKS.filter(t=>ids.includes(t.id))){assert.equal(t.guide.steps.length,t.goal.all.length);assert.ok(t.guide.cue.length<=90);for(const s of t.guide.steps)assert.ok(s.label.length<=20&&s.hint.length<=30,t.id);}
});
test('购买只认接取后的猫猫实物子弹，制作、失败和旧库存不算',()=>{
 const g=scene('supply-ammo');g.cottage={kind:'ammo',outside:{...g.player}};const buy={kind:'ammo',id:'light',target:'hand'};
 g.progress.mainline.phase='meet';assert.ok(tradeSupply(g,buy).ok);assert.equal(g.progress.mainline.seen.ammoPurchased,0);
 g.progress.mainline.phase='doing';assert.ok(tradeSupply(g,{...buy,craft:true}).ok);assert.equal(g.progress.mainline.seen.ammoPurchased,0);
 const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(tradeSupply(g,buy).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(tradeSupply(g,buy).ok);assert.ok(mainlineCondition(g,mainlineTask(g).goal));
 assert.equal(validateProgress(structuredClone(g.progress)).mainline.seen.ammoPurchased,1);
});
test('仓库预览、自动入库和保存失败不计教学；手动存取同事务保留',()=>{
 const g=scene('warehouse-lesson');warehouse(g);g.progress.logistics.bagWood=1;updateWarehouseWood(g,.1);assert.equal(g.progress.mainline.seen.warehouseDeposited,0);
 assert.ok(warehouseTransferPreview(g,'bag','material:wood',1,'withdraw').ok);assert.equal(g.progress.mainline.seen.warehouseWithdrawn,0);
 g.livingPersist=()=>false;assert.equal(transferWarehouse(g,'bag','material:wood',1,'withdraw').ok,false);assert.equal(g.progress.mainline.seen.warehouseWithdrawn,0);
 g.livingPersist=()=>true;assert.ok(transferWarehouse(g,'bag','material:wood',1,'withdraw').ok);assert.ok(transferWarehouse(g,'bag','material:wood',1,'deposit').ok);
 assert.ok(mainlineCondition(g,mainlineTask(g).goal));assert.equal(validateProgress(structuredClone(g.progress)).mainline.seen.warehouseDeposited,1);
});
test('载重浏览与真实货舱装载分别记录，活动预览和背包取货不算装车',()=>{
 const g=scene('vehicle-weight');warehouse(g);g.story={};assert.equal(inspectLogisticsLesson(g,'vehicleLoadViewed'),false);g.story=null;
 assert.ok(inspectLogisticsLesson(g,'vehicleLoadViewed'));assert.ok(transferWarehouse(g,'bag','material:wood',1,'withdraw').ok);assert.equal(g.progress.mainline.seen.cargoLoaded,0);
 assert.ok(transferWarehouse(g,0,'material:wood',1,'withdraw').ok);assert.ok(mainlineCondition(g,mainlineTask(g).goal));
});
test('背包和货舱清理不能串账，保存失败保留物品与任务标记',()=>{
 for(const [id,hull,key,other] of [['bag-cleanup',null,'bagCleaned',0],['cargo-cleanup',0,'cargoCleaned',null]]){
  const g=scene(id);g.progress.logistics.bagWood=2;g.progress.logistics.builds[0].wood=2;
  assert.ok(discardLoad(g,{hull:other,id:'material:wood',count:1}).ok);assert.equal(g.progress.mainline.seen[key],0);
  const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(discardLoad(g,{hull,id:'material:wood',count:1}).ok,false);assert.deepEqual(g.progress,before);
  g.livingPersist=()=>true;assert.ok(discardLoad(g,{hull,id:'material:wood',count:1}).ok);assert.equal(validateProgress(structuredClone(g.progress)).mainline.seen[key],1);
  assert.doesNotThrow(()=>mainlineObjective(g));assert.equal(mainlineAction(g),null);
 }
});
test('空货舱指向仓库，远处有货车辆指向真实停车处',()=>{
 const g=scene('cargo-cleanup');g.progress.logistics.builds[0].wood=0;g.progress.supplies.vehicles[0]={light:0,shell:0,heavy:0,water:0};if(g.vehicle.module)g.vehicle.module.magazine.ammo=0;
 assert.equal(mainlineObjective(g).key,'warehouseEntry');assert.equal(mainlineAction(g).type,'warehouse');
 g.progress.logistics.builds[0].wood=1;g.progress.campParking.owned=[{hull:0,spot:null,x:3000,y:1800,mapId:'forest',hp:1,ammo:0,reload:0,wheel:0,track:0}];
 assert.equal(mainlineObjective(g).site.x,3000);assert.equal(mainlineAction(g).type,'cleanup-vehicle');
});
test('维修下单不能算修好，真实修复完成才记账',()=>{
 const g=scene('repair-center');Object.assign(g.player,{x:REPAIR_CENTER.x,y:REPAIR_CENTER.y+70});g.trees=[];g.vehicle.active=true;g.vehicle.hp=g.vehicle.maxHp*.9;
 inspectLogisticsLesson(g,'repairVisited');assert.ok(requestVehicleRepair(g,0).ok);assert.equal(g.progress.mainline.seen.repairChecked,0);
 for(let i=0;i<200;i++)updateVehicleRepair(g,.1);assert.equal(g.progress.mainline.seen.repairChecked,1);assert.ok(mainlineCondition(g,mainlineTask(g).goal));
});
test('旧档当前任务和待领奖状态保留，全通旧档从新增教学见面开始',()=>{
 const old=MAINLINE_IDS.filter(id=>!Object.values(LOGISTICS_LESSONS).includes(id));
 for(const phase of ['doing','report']){const p=freshProgress();Object.assign(p.mainline,{version:10,currentId:'vehicle-service',phase,completed:old.slice(0,old.indexOf('vehicle-service'))});const next=validateProgress(p);assert.equal(currentMainlineTask(next.mainline).id,'vehicle-service');assert.equal(next.mainline.phase,phase);}
 const p=freshProgress();Object.assign(p.mainline,{version:10,currentId:null,phase:'complete',completed:old});const next=validateProgress(p);assert.equal(currentMainlineTask(next.mainline).id,'supply-ammo');assert.equal(next.mainline.phase,'meet');assert.deepEqual(next.mainline.completed,old);
});
test('新增任务交付失败不领奖，成功后按顺序续接且不会重复发奖',()=>{
 const g=scene('bag-cleanup');g.progress.logistics.bagWood=1;assert.ok(discardLoad(g,{id:'material:wood',count:1}).ok);Object.assign(g.player,MAINLINE_SITES.weapons);updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');
 const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(mainlineTask(g).id,'first-patrol');assert.equal(completeMainline(g),false);
});
