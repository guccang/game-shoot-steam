// 割草循环回归：扩容收益守恒、旧档不增战绩、新枪选择与真实结算、暂停和小队上限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,clearingRewardTotal,clearingWaveBudget,clearingKillReward} from '../src/config/waves.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';
import {MAINLINE_IDS,currentMainlineTask} from '../src/config/mainline.js';
import {validateMainline} from '../src/progression/mainline-progress.js';
import {mainlineCondition,mainlineOperation} from '../src/core/mainline-manager.js';
import {recordMainlineCombat} from '../src/progression/mainline-combat.js';
import {CLEARING_DENSITY} from '../src/config/clearing-difficulty.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 仅准备自有装备与任务前置，不修改工厂属性或战斗命中。
function scene(id='buy-shotgun'){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(t=>t.id);
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';
 const g=new Game(p,()=>.5);g.start();g.mainlineTalkDelay=9999;g.mainlineSpeech=null;return g;
}
test('版本6活跃与死亡存档扩容保留领奖比例和真实累计击杀，重复读取幂等',()=>{
 for(const wave of [1,5,6,20,100])for(const state of ['active','dead']){
  const old=clearingRewardTotal(wave),total=waveDifficulty(wave).total;
  for(let n=0;n<=old;n++){
   const raw={version:1,waveQuotaVersion:6,state,wave,waveKills:n,kills:n,bossWave:wave,bossReady:n===old,waveRest:0};
   const saved=validatePatrol(raw);assert.equal(saved.waveKills,Math.ceil(n*total/old));assert.equal(saved.kills,n);
   assert.equal(saved.bossReady,raw.bossReady);assert.deepEqual(validatePatrol(saved),saved);
   for(const [key,budget] of Object.entries(clearingWaveBudget(wave))){
    const remaining=Array.from({length:total-saved.waveKills},(_,i)=>clearingKillReward(wave,saved.waveKills+i)[key]).reduce((a,b)=>a+b,0);
    assert.ok(remaining<=budget-Math.floor(n*budget/old));
   }
  }
 }
});
test('散弹或激光均可完成购买目标，装备入口沿用玩家所选武器',()=>{
 for(const index of [1,3]){const g=scene();g.progress.weapons[index]=1;g.progress.weapon=index;
  assert.ok(mainlineCondition(g,currentMainlineTask(g.progress.mainline).goal));
  g.progress.weapon=0;assert.equal(mainlineCondition(g,currentMainlineTask(g.progress.mainline).goal),false);
  assert.equal(mainlineOperation(g).index,index);
 }
});
test('清缴紧接购买，但胜利不限制武器，未接取与失败不能代做',()=>{
 assert.equal(MAINLINE_IDS.indexOf('weapon-field'),MAINLINE_IDS.indexOf('buy-shotgun')+1);
 const g=scene('weapon-field'),p=g.progress;
 assert.equal(recordMainlineCombat(p,'clearing',{won:false}),false);
 p.weapon=1;p.weapons[1]=1;p.mainline.phase='meet';assert.equal(recordMainlineCombat(p,'clearing'),false);
 p.mainline.phase='doing';p.weapon=0;assert.ok(recordMainlineCombat(p,'clearing'));assert.equal(p.mainline.seen.weaponField,1);
});
test('四版进行中与待领奖任务保持，旧版全通只补新枪实战',()=>{
 const oldIds=MAINLINE_IDS.filter(id=>id!=='weapon-field');
 for(const phase of ['doing','report'])for(const id of ['football-day','own-hover','controller-setup']){
  const raw={version:4,completed:oldIds.slice(0,oldIds.indexOf(id)),phase,seen:{}};
  const run=validateMainline(raw);assert.equal(currentMainlineTask(run).id,id);assert.equal(run.phase,phase);
  assert.deepEqual(validateMainline(run),run);
 }
 const done=validateMainline({version:4,completed:oldIds,phase:'complete'});assert.equal(currentMainlineTask(done).id,'weapon-field');assert.equal(done.phase,'meet');
});
test('一次更新只生成一个小队，暂停与场外不补刷，现场不超上限',()=>{
 const g=scene();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});
 g.wave=10;g.bossWave=10;g.waveWarning=g.waveKills=g.waveSpawned=0;g.enemies=[];g.trees=[];
 g.state='paused';g.updateWaves(30);assert.equal(g.waveSpawned,0);
 g.state='playing';g.updateWaves(.1);assert.ok(g.waveSpawned>1&&g.waveSpawned<=CLEARING_DENSITY.batch);
 const first=g.waveSpawned;g.updateWaves(30);assert.ok(g.waveSpawned-first<=CLEARING_DENSITY.batch);
 for(let i=0;i<30;i++)g.updateWaves(1.3);
 assert.ok(g.enemies.filter(e=>e.hp>0).length<=CLEARING_DENSITY.maxAlive);
 Object.assign(g.player,{x:0,y:0});const before=g.waveSpawned;g.updateWaves(30);assert.equal(g.waveSpawned,before);
});
