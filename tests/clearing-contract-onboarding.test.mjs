import {clearingSite} from '../src/progression/clearing-site.js';
// 清缴结束重接与入职可执行操作提示的针对性回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost,clearingStage} from '../src/core/clearing-guide.js';
import {clearingCombatActive} from '../src/core/living-safety.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {waveDifficulty} from '../src/config/waves.js';
import {arrivalWorkshopGuide} from '../src/ui/arrival-workshop-guide.js';
import {arrivalWorkReady,advanceArrival} from '../src/core/ranger-arrival.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {RESTORATION_FLIGHT} from '../src/config/town-restoration.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {WORKSHOP} from '../src/world/workshop.js';
// 现场接取后走到真实清缴场，使用正式Boss击杀和保存快照。
function clearing(){const g=new Game(freshProgress(),()=>.5);g.start();Object.assign(g.player,CLEARING_APPROACH);assert.ok(acceptClearingPost(g).ok);Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});g.wave=g.bossWave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;g.waveWarning=0;return g;}
test('击败本组Boss结束清缴，等待及刷新不会自动开始下一组，现场重新接取才恢复',()=>{
 const g=clearing();assert.ok(clearingCombatActive(g));assert.ok(g.summonBoss());const boss=g.boss;g.hit(boss,1e9);const coins=g.progress.coins;
 assert.equal(g.progress.living.patrolActive,false);assert.equal(clearingCombatActive(g),false);assert.equal(clearingStage(g),'accept');const wave=g.wave;g.updateWaves(100);assert.equal(g.wave,wave);g.hit(boss,1e9);assert.equal(g.progress.coins,coins);
 const p=validateProgress({...g.progress,patrol:capturePatrol(g)}),restored=new Game(p,()=>.5);restored.start();Object.assign(restored.player,{x:clearingSite(restored.progress).x,y:clearingSite(restored.progress).y});restored.updateWaves(100);assert.equal(restored.wave,wave);assert.equal(acceptClearingPost(restored).ok,false);
 Object.assign(restored.player,CLEARING_APPROACH);assert.ok(acceptClearingPost(restored).ok);Object.assign(restored.player,{x:clearingSite(restored.progress).x,y:clearingSite(restored.progress).y});restored.updateWaves(3);assert.equal(restored.wave,wave+1);assert.equal(restored.waveKills,0);
});
test('组内清波继续节点，死亡重试仍保留同一份任务',()=>{
 const g=clearing();g.bossReady=false;g.wave=g.waveGroupStart;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.updateWaves(.1);assert.ok(g.progress.living.patrolActive);g.updateWaves(3);assert.equal(g.wave,2);g.bossReady=true;g.wave=g.bossWave;g.summonBoss();g.hurt(1e9);assert.ok(g.progress.living.patrolActive);
});
// 从入职采集完成状态出发，工坊仍使用正式距离、钥匙和费用校验。
function arrival(){const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:RANGER.repairWood+RANGER.pistolWood,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood+RANGER.pistolWood;const g=new Game(p,()=>.5);g.start();return g;}
test('修复提示指向到达后的点击修复按钮，骑车修复不提前要求下车',()=>{
 const g=arrival();assert.ok(arrivalWorkReady(g));assert.equal(arrivalWorkshopGuide(g).source,'#nearby-interaction');assert.equal(arrivalWorkshopGuide(g).text,'点击修复武器工坊');assert.equal(arrivalWorkshopGuide(g,'arrival-workshop-dialog').source,'#arrival-workshop-action');
 g.player.x+=300;assert.equal(arrivalWorkshopGuide(g).text,'走到这间工坊门前');g.vehicle.active=true;assert.match(arrivalWorkshopGuide(g).source,/world-workshop-entry/);assert.equal(arrivalWorkshopGuide(g,'settings-dialog'),null);
});
test('修复后任务指引购买，采集和完成阶段不留下旧高亮',()=>{
 const g=arrival();assert.ok(advanceArrival(g));assert.equal(arrivalWorkshopGuide(g),null);for(let i=0;i<Math.ceil((RANGER.rebuildSeconds+RESTORATION_FLIGHT+.2)/.05);i++)g.update(.05);assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.progress.wood,16);assert.equal(arrivalWorkshopGuide(g,'workshop-dialog').source,'#ws-purchase');
 assert.equal(advanceArrival(g),false);assert.ok(commitWorkshop(g,{kind:'weapons',index:0,action:'buy'},()=>true).ok);assert.equal(g.arrivalPending,false);assert.equal(g.progress.weapons[0],1);assert.equal(arrivalWorkshopGuide(g),null);
});
