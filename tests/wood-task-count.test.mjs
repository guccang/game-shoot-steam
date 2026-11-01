// 木材任务回归：实际拾取更新显示，装卸守恒，采齐与入库施工分别校验。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {woodTaskStatus} from '../src/core/wood-task-status.js';
import {collectAutomaticWood} from '../src/core/wood-pickup.js';
import {transferWood,storeWood} from '../src/core/wood-storage.js';
import {mainlineSteps} from '../src/core/mainline-manager.js';
import {restorationObjective,restorationStatus,repairFacility} from '../src/core/town-restoration.js';
import {arrivalWorkshopObjective,arrivalTarget} from '../src/core/ranger-arrival.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CAMP_WAREHOUSE} from '../src/config/wood-storage.js';
import {RANGER} from '../src/config/ranger-arrival.js';

const facility=TOWN_RESTORATIONS.find(f=>f.id==='clearing');
// 只推进到待修告示牌，库存、采集事务和任务解释器全部使用正式对象。
function scene(arrival=false){
 const p=arrival?freshRangerProgress():freshProgress();p.wood=0;p.vehicleHulls[0]=1;p.vehicleIndex=0;
 if(arrival)Object.assign(p.arrival,{phase:'gather',keys:true,parked:false});
 else{p.mainline.currentId=facility.before;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(facility.before));p.mainline.phase='doing';p.restoration.cottageRested=true;}
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.trees=[];g.enemies=[];
 g.livingPersist=g.restorationPersist=()=>true;Object.assign(g.player,{x:2600,y:1800});return g;
}
// 拾取调用与树木死亡同源，数量必须确实进入某一实物库存才记入任务。
function gather(g,count){return collectAutomaticWood(g,{type:'tree',x:g.player.x+80,y:g.player.y},count);}

for(const driving of [false,true])test((driving?'车载':'背包')+'采集当笔更新任务进度，入库前不允许提前施工',()=>{
 const g=scene();g.vehicle.active=driving;assert.ok(gather(g,8));
 assert.equal(mainlineSteps(g)[0].progress,'8/40');assert.equal(mainlineSteps(g)[0].done,false);
 assert.match(restorationObjective(g,{}).hint,/还差 32 木头/);assert.equal(g.progress.wood,0);
 assert.ok(gather(g,32));const steps=mainlineSteps(g);assert.equal(steps[0].progress,'40/40');assert.equal(steps[0].done,true);assert.equal(steps[1].done,false);
 assert.equal(restorationObjective(g,{}).key,'store-wood-clearing');
 Object.assign(g.player,facility.site);assert.equal(repairFacility(g,facility.id).ok,false);
 Object.assign(g.player,CAMP_WAREHOUSE);assert.ok(storeWood(g).ok);assert.equal(woodTaskStatus(g,40).total,40);assert.equal(woodTaskStatus(g,40).stored,true);
 Object.assign(g.player,facility.site);assert.ok(repairFacility(g,facility.id).ok);assert.equal(g.progress.wood,0);
});

test('仓库背包与全部自有车辆合并统计，远车引导取货且未拥有车不计数',()=>{
 const g=scene();g.progress.wood=8;g.progress.logistics.bagWood=8;g.progress.logistics.builds[0].wood=24;g.progress.logistics.builds[1].wood=100;
 g.progress.campParking.owned=[{hull:0,mapId:'forest',x:4000,y:2000,spot:null,hp:100}];
 let status=woodTaskStatus(g,40);assert.equal(status.total,40);assert.equal(status.vehicles,24);assert.equal(status.destination.kind,'retrieve');assert.equal(status.destination.site.x,4000);
 assert.equal(mainlineSteps(g)[0].done,true);assert.equal(restorationObjective(g,{}).key,'retrieve-wood-clearing');
 Object.assign(g.player,{x:4000,y:2000});status=woodTaskStatus(g,40);assert.equal(status.destination.kind,'store');
});

test('装卸与入库不增加采集总数，使用已有材料后按剩余库存重新计算',()=>{
 const g=scene();assert.ok(gather(g,32));g.progress.wood=8;
 assert.ok(transferWood(g,0,16,'load').ok);assert.equal(woodTaskStatus(g,40).total,40);
 assert.ok(transferWood(g,0,8,'unload').ok);assert.equal(woodTaskStatus(g,40).total,40);
 Object.assign(g.player,CAMP_WAREHOUSE);assert.ok(storeWood(g).ok);assert.equal(woodTaskStatus(g,40).total,40);
 g.progress.wood-=10;assert.equal(woodTaskStatus(g,40).missing,10);assert.equal(mainlineSteps(g)[0].done,false);
});

test('保存失败不虚增任务，存档往返保留背包和货舱进度',()=>{
 const g=scene();g.livingPersist=()=>false;assert.equal(gather(g,8),false);assert.equal(mainlineSteps(g)[0].progress,'0/40');
 g.livingPersist=()=>true;assert.ok(gather(g,8));g.vehicle.active=true;assert.ok(gather(g,16));
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(mainlineSteps(g)[0].progress,'24/40');assert.equal(restorationStatus(g,facility.id).wood.total,24);
});

test('新手工坊也识别背包与远车库存，采齐后导航取货和入库',()=>{
 const g=scene(true);g.progress.logistics.bagWood=RANGER.repairWood/2;g.progress.logistics.builds[0].wood=RANGER.repairWood/2;
 g.progress.campParking.owned=[{hull:0,mapId:'forest',x:4000,y:2000,spot:null,hp:100}];
 assert.equal(woodTaskStatus(g,RANGER.repairWood).collected,true);
 assert.equal(arrivalWorkshopObjective(g).key,'arrival-wood-retrieve');assert.equal(arrivalTarget(g).x,4000);
 Object.assign(g.player,{x:4000,y:2000});assert.equal(arrivalWorkshopObjective(g).key,'arrival-wood-store');assert.deepEqual(arrivalTarget(g),CAMP_WAREHOUSE);
});
