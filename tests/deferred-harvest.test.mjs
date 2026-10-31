// 收获安排在巡护之后、升级之前；旧的即时收获任务仍正常迁移，成熟不打断巡护。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,currentMainlineTask,MAINLINE_SITES} from '../src/config/mainline.js';
import {MAINLINE_V7_IDS,MAINLINE_V8_IDS} from '../src/config/mainline-legacy.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {updateMainline,completeMainline} from '../src/core/mainline-manager.js';
import {farmAction} from '../src/core/farm.js';
import {FARM_CROPS} from '../src/config/farm.js';
// 准备浇水后正常巡护的存档，作物时间不决定当前或下一个任务。
function scene(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-patrol'));p.mainline.currentId='first-patrol';p.mainline.phase='doing';p.farm.planted=p.farm.dug=p.farm.watered=1;p.farm.plots=[{id:3,mapId:'forest',x:900,y:2800,crop:0,plantedAt:Date.now(),readyAt:Date.now()+45000,watered:true}];p.farm.nextId=4;p.farm.lessonRewarded=true;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.boss=null;Object.assign(g.player,MAINLINE_SITES.camp);return g;}

test('两次种植之间保留战斗、整备和故事，收获只放在首次清缴之后',()=>{
 assert.equal(MAINLINE_IDS.includes('first-harvest'),false);
 const between=MAINLINE_IDS.slice(MAINLINE_IDS.indexOf('first-farm')+1,MAINLINE_IDS.indexOf('neighbor-garden'));
 for(const id of ['first-patrol','pistol-upgrade','pistol-field','first-letter','weapon-field','football-day'])assert.ok(between.includes(id));
 assert.ok(between.length>=5);assert.deepEqual(MAINLINE_TASKS.filter(t=>t.guide.steps.some(s=>s.operation?.id==='harvest')).map(t=>t.id),['upgrade-harvest']);
});

test('未成熟、已成熟和刷新都不打断巡护，交付巡护后接收获',()=>{
 for(const mature of [false,true]){const g=scene();if(mature)g.progress.farm.plots[0].readyAt=Date.now()-1;
  updateMainline(g,0);g.progress=validateProgress(structuredClone(g.progress));assert.equal(currentMainlineTask(g.progress.mainline).id,'first-patrol');
  g.progress.bosses=1;updateMainline(g,0);assert.ok(completeMainline(g));assert.equal(currentMainlineTask(g.progress.mainline).id,'upgrade-harvest');
  g.progress.farm.plots[0].readyAt=Date.now()-1;updateMainline(g,0);assert.equal(currentMainlineTask(g.progress.mainline).id,'upgrade-harvest');
 }
});

test('自由收割正常获得金币且不产生任务或重复奖励',()=>{
 const g=scene(),p=g.progress.farm.plots[0];Object.assign(g.player,p);const coins=g.progress.coins;p.readyAt=Date.now()-1;
 assert.ok(farmAction(g,'harvest',{plot:3}).ok);assert.equal(g.progress.coins,coins+FARM_CROPS[0].value);assert.equal(currentMainlineTask(g.progress.mainline).id,'first-patrol');
 assert.equal(farmAction(g,'harvest',{plot:3}).ok,false);assert.equal(g.progress.coins,coins+FARM_CROPS[0].value);
 Object.assign(g.player,MAINLINE_SITES.camp);g.progress.bosses=1;updateMainline(g,0);assert.ok(completeMainline(g));assert.equal(currentMainlineTask(g.progress.mainline).id,'upgrade-harvest');
});

test('旧收获任务各阶段转到下一项见面，删除旧完成记录且不改田地或余额',()=>{
 for(const phase of ['meet','doing','report'])for(const explicit of [false,true]){
  const p=scene().progress;p.mainline={...p.mainline,version:8,currentId:explicit?'first-harvest':null,harvestReady:true,phase};
  const next=validateProgress(p);assert.equal(currentMainlineTask(next.mainline).id,'first-patrol');assert.equal(next.mainline.phase,'meet');assert.equal(next.coins,p.coins);assert.equal(next.wood,p.wood);assert.deepEqual(next.farm,p.farm);assert.deepEqual(validateProgress(structuredClone(next)),next);
 }
 const p=scene().progress;p.mainline={...p.mainline,version:8,currentId:'first-harvest',phase:'report',completed:MAINLINE_V8_IDS.filter(id=>id!=='first-harvest')};
 const next=validateProgress(p);assert.equal(next.mainline.phase,'complete');assert.equal(currentMainlineTask(next.mainline),null);
});

test('未接取的旧照顾任务按新顺序延后，已播种及待交付进度保留',()=>{
 for(const phase of ['meet','doing','report']){
  const p=freshProgress();p.mainline={...p.mainline,version:8,currentId:'neighbor-garden',completed:MAINLINE_V8_IDS.slice(0,MAINLINE_V8_IDS.indexOf('neighbor-garden')),phase};
  p.mainline.gardening={taskId:'neighbor-garden',plotId:3,planted:1,watered:1};const next=validateProgress(p);
  assert.equal(currentMainlineTask(next.mainline).id,phase==='meet'?'first-letter':'neighbor-garden');assert.equal(next.mainline.phase,phase);assert.equal(next.mainline.gardening.plotId,3);assert.equal(next.mainline.gardening.watered,1);
  assert.equal(next.mainline.completed.includes('first-harvest'),false);assert.deepEqual(validateProgress(structuredClone(next)),next);
 }
});

test('七版当前委托及领奖阶段保留，旧种田档浇水后即可交付',()=>{
 for(const id of ['first-farm','neighbor-garden','first-patrol','pistol-upgrade'])for(const phase of ['doing','report']){
  const p=freshProgress();p.mainline={...p.mainline,version:7,currentId:null,completed:MAINLINE_V7_IDS.slice(0,MAINLINE_V7_IDS.indexOf(id)),phase};
  const next=validateProgress(p);assert.equal(currentMainlineTask(next.mainline).id,id==='pistol-upgrade'&&phase==='doing'?'upgrade-harvest':id);assert.equal(next.mainline.phase,phase);assert.deepEqual(validateProgress(structuredClone(next)),next);
 }
 const g=scene();g.progress.mainline.currentId='first-farm';g.progress.mainline.completed=g.progress.mainline.completed.filter(id=>id!=='first-farm');updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');assert.equal(g.progress.farm.harvested,0);
});
