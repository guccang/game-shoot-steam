// 收获安排在巡护之后、升级之前；旧的即时收获任务仍正常迁移，成熟不打断巡护。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,currentMainlineTask,MAINLINE_SITES} from '../src/config/mainline.js';

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
