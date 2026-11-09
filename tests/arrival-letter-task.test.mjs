// 来信是正式入职检查点：保存、跳过短剧、余额分流与赠车驾驶互不冲突。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {skipArrivalJourney,completeArrivalLetter,arrivalTarget} from '../src/core/camp/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
// 快速交付原定赠品，保持正式的待阅读状态。
function waiting(){const g=new Game(freshRangerProgress(),()=>.5);g.start();assert.ok(skipArrivalJourney(g));return g;}
test('自然九秒开场和跳过开场均先进入阅读任务，不自动打开或完成',()=>{
 const g=new Game(freshRangerProgress());g.start();
 for(let i=0;i<180;i++)g.update(.05);
 assert.equal(g.progress.arrival.phase,'letter');assert.equal(g.arrivalCinematic,false);
 assert.equal(arrivalTarget(g),null);assert.equal(waiting().progress.arrival.phase,'letter');
 const restored=new Game(validateProgress(structuredClone(g.progress)));restored.start();
 restored.update(.05);assert.equal(restored.progress.arrival.phase,'letter');
});
test('材料足够也先保留阅读任务，确认后进入上车引导且不扣费',()=>{
 const g=waiting();g.progress.wood=RANGER.repairWood;
 Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});g.update(.05);
 assert.equal(g.progress.arrival.phase,'letter');assert.equal(g.progress.wood,RANGER.repairWood);
 g.pause();assert.ok(completeArrivalLetter(g));assert.equal(g.progress.arrival.phase,'ride-guide');
 assert.equal(g.state,'paused');assert.equal(g.progress.wood,RANGER.repairWood);
});
test('读完后进入上车引导，重复阅读和重新加载不重置任务或发放奖励',()=>{
 const g=waiting(),before={wood:g.progress.wood,coins:g.progress.coins,hulls:[...g.progress.vehicleHulls]};
 assert.ok(completeArrivalLetter(g));assert.equal(g.progress.arrival.phase,'ride-guide');
 assert.equal(completeArrivalLetter(g),false);
 const restored=new Game(structuredClone(g.progress));assert.equal(restored.progress.arrival.phase,'ride-guide');
 assert.deepEqual({wood:g.progress.wood,coins:g.progress.coins,hulls:g.progress.vehicleHulls},before);
});
test('阅读保存失败留在原任务，暂停面板中可重试且只提交一次',()=>{
 const g=waiting();g.pause();g.arrivalPersist=()=>false;
 assert.equal(completeArrivalLetter(g),false);assert.equal(g.progress.arrival.phase,'letter');assert.equal(g.arrivalError,true);
 let saves=0;g.arrivalPersist=()=>{saves++;return true;};
 assert.ok(completeArrivalLetter(g));assert.equal(g.arrivalError,false);
 assert.equal(completeArrivalLetter(g),false);assert.equal(saves,1);
});
test('未交接钥匙和非游玩状态不能越过阅读步骤',()=>{
 const g=waiting();g.progress.arrival.keys=false;assert.equal(completeArrivalLetter(g),false);
 g.progress.arrival.keys=true;g.state='gameover';assert.equal(completeArrivalLetter(g),false);
});
