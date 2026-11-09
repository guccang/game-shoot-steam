// 收获整备任务专项：田块优先级、金币预算、真实事务、旧档和任务接续。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {harvestBudget,harvestGuidePlot,harvestGuideHint} from '../src/core/farming/harvest-guide.js';
import {mainlineObjective,mainlineSteps,updateMainline} from '../src/core/story/mainline-manager.js';
import {awardMainline} from '../src/progression/story/mainline-reward.js';
import {farmAction} from '../src/core/farming/farm.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {mainlineConditionCost} from '../src/progression/story/mainline-cost.js';
const task=MAINLINE_TASKS.find(t=>t.id==='upgrade-harvest');
// 固定使用森林南侧合法野田附近，清空战斗与树木以隔离收割事务。
function scene(){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(task.id));p.mainline.currentId=task.id;p.mainline.phase='doing';p.coins=10;p.wood=1000;
 p.farm.plots=[plot(1,0,false,893,2752),plot(2,3,true,949,2752),plot(3,3,true,1005,2752)];p.farm.nextId=4;
 const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.boss=null;g.trees=[];g.vehicle.active=false;Object.assign(g.player,{x:893,y:2814});updateMainline(g,0);return g;
}
// 真实成熟时间和独立编号使读档、收空后的重选都有可断言的来源。
function plot(id,crop,wild,x,y){return {id,mapId:'forest',x,y,crop,plantedAt:0,readyAt:0,watered:false,...(wild?{wild:true,wildSownAt:0}:{})};}
// 移到田边后调用正式收割，不直接修改金币或任务计数。
function harvest(g,id){const p=g.progress.farm.plots.find(p=>p.id===id);Object.assign(g.player,{x:p.x,y:p.y+62});return farmAction(g,'harvest',{plot:id});}

test('清缴之后直接接收获，收获之前仍保留先种田后巡护的顺序',()=>{
 const p=scene().progress;p.mainline.currentId='first-patrol';p.mainline.completed=p.mainline.completed.filter(id=>id!=='first-patrol');
 assert.ok(awardMainline(p,'first-patrol'));assert.equal(currentMainlineTask(p.mainline).id,task.id);assert.equal(p.mainline.phase,'doing');assert.equal(p.mainline.gardening.harvested,0);
 assert.equal(MAINLINE_IDS[MAINLINE_IDS.indexOf(task.id)+1],'pistol-upgrade');
});
test('成熟自种田优先；未成熟则导航营地外已有成熟野田',()=>{
 const g=scene();Object.assign(g.player,{x:1005,y:2814});assert.equal(harvestGuidePlot(g).id,1);
 g.progress.farm.plots[0].readyAt=Date.now()+60000;assert.equal(harvestGuidePlot(g).id,3);
 assert.equal(mainlineObjective(g).site.id,3);assert.match(mainlineSteps(g)[0].hint,/营地外野田/);
 assert.equal(g.progress.farm.plots[0].readyAt>Date.now(),true);assert.equal(g.progress.farm.plots.length,3);
});
test('空田、异地图、营地内野田不抢占成熟目标，已收空后重选',()=>{
 const g=scene();g.progress.farm.plots[0].crop=null;g.progress.farm.plots.push({...plot(4,5,true,893,2800),mapId:'jiuzhaigou'});
 assert.equal(harvestGuidePlot(g).id,2);assert.ok(harvest(g,2).ok);assert.equal(harvestGuidePlot(g).id,3);
});
test('收获按实际作物到账，不足继续收；攒够就地进入升级且不额外送金币',()=>{
 const g=scene(),cost=harvestBudget(g.progress,task).cost;assert.ok(cost>40);
 assert.ok(harvest(g,1).ok);assert.equal(g.progress.coins,10+FARM_CROPS[0].value);updateMainline(g,0);assert.equal(currentMainlineTask(g.progress.mainline).id,task.id);
 let income=FARM_CROPS[0].value;
 for(let id=2;!harvestBudget(g.progress,task).ready;id++){
  if(!g.progress.farm.plots.some(p=>p.id===id)){g.progress.farm.plots.push(plot(id,3,true,893,2752+id*52));g.progress.farm.nextId=id+1;}
  assert.ok(harvest(g,id).ok);income+=FARM_CROPS[3].value;
 }
 updateMainline(g,0);assert.equal(currentMainlineTask(g.progress.mainline).id,'pistol-upgrade');assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.progress.coins,10+income);
 assert.ok(g.progress.mainline.completed.includes(task.id));assert.equal(g.mainlineSpeech,null);
 updateMainline(g,0);assert.equal(g.progress.coins,10+income);
});
test('预算扣除已经升级的部分，钱包和等级变化立即更新',()=>{
 const g=scene(),before=harvestBudget(g.progress,task).cost;
 g.progress.weapons[0]=3;g.progress.weaponParts[0].damage=3;
 const cost=harvestBudget(g.progress,task).cost;assert.ok(cost<before);assert.equal(cost,mainlineConditionCost(g.progress,{path:'progress.heroes.0',min:2}).coins);
 g.progress.coins=cost;assert.equal(harvestBudget(g.progress,task).missing,0);assert.equal(harvestBudget(g.progress,task).ready,false);
 assert.ok(harvest(g,1).ok);assert.equal(harvestBudget(g.progress,task).ready,true);
});
test('失败收割和失败保存不发金币或进度，任务提交失败可原地重试',()=>{
 const g=scene();g.progress.coins=1000;g.livingPersist=()=>false;
 assert.equal(harvest(g,1).ok,false);assert.equal(g.progress.coins,1000);assert.equal(g.progress.mainline.gardening.harvested,0);
 g.livingPersist=()=>true;assert.ok(harvest(g,1).ok);const coins=g.progress.coins;
 g.mainlinePersist=()=>false;updateMainline(g,0);assert.equal(currentMainlineTask(g.progress.mainline).id,task.id);assert.equal(g.progress.coins,coins);
 const xp=g.progress.campLevel.xp;g.mainlinePersist=()=>true;updateMainline(g,0);assert.equal(currentMainlineTask(g.progress.mainline).id,'pistol-upgrade');assert.ok(g.progress.campLevel.xp>xp);assert.equal(g.progress.coins,coins);
});
test('空作物旧档显示补种入口，未熟且无野田时指向最早成熟田',()=>{
 const g=scene();for(const p of g.progress.farm.plots)p.crop=null;
 assert.equal(harvestGuidePlot(g),null);assert.equal(mainlineObjective(g).navigation,false);assert.equal(mainlineSteps(g)[0].operation.id,'plant');
 assert.match(harvestGuideHint(g,task),/库存种子/);
 g.progress.farm.plots[0].crop=0;g.progress.farm.plots[0].readyAt=Date.now()+60000;
 assert.equal(harvestGuidePlot(g).id,1);assert.match(mainlineSteps(g)[0].hint,/秒后成熟/);
});
test('正在升级的九版档插入收获，金币、田地和已有等级完整保留且迁移幂等',()=>{
 for(const phase of ['meet','doing']){
  const p=scene().progress;p.mainline.version=9;p.mainline.currentId='pistol-upgrade';p.mainline.phase=phase;p.weapons[0]=3;p.weaponParts[0].damage=3;
  const next=validateProgress(structuredClone(p));assert.equal(next.mainline.currentId,task.id);assert.equal(next.mainline.phase,'doing');assert.equal(next.coins,10);assert.equal(next.weapons[0],3);assert.deepEqual(next.farm.plots,p.farm.plots);assert.deepEqual(validateProgress(structuredClone(next)),next);
 }
});
test('旧档升级已完成或待领奖保持原任务，新档收获计数刷新保留',()=>{
 for(const id of ['pistol-upgrade','pistol-field']){
  const p=scene().progress;p.mainline.version=9;p.mainline.currentId=id;p.mainline.phase='report';p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id)).filter(v=>v!==task.id);
  const next=validateProgress(p);assert.equal(next.mainline.currentId,id);assert.equal(next.mainline.phase,'report');assert.ok(next.mainline.completed.includes(task.id));assert.equal(next.coins,p.coins);
 }
 const g=scene();assert.ok(harvest(g,1).ok);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.mainline.gardening.harvested,1);assert.equal(g.progress.mainline.currentId,task.id);
});
