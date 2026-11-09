// 割草循环回归：扩容收益守恒、旧档不增战绩、新枪选择与真实结算、暂停和小队上限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,clearingRewardTotal,clearingWaveBudget,clearingKillReward} from '../src/config/waves.js';
import {validatePatrol} from '../src/progression/battle/patrol-progress.js';
import {MAINLINE_IDS,currentMainlineTask} from '../src/config/mainline.js';
import {validateMainline} from '../src/progression/story/mainline-progress.js';
import {mainlineCondition,mainlineOperation} from '../src/core/story/mainline-manager.js';
import {recordMainlineCombat} from '../src/progression/story/mainline-combat.js';
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
// 任务明确要求散弹枪；激光不能代做，已有散弹枪只需装备。
test('购买任务只接受散弹枪，购买与装备引导均指向同一武器',()=>{
 const g=scene(),task=currentMainlineTask(g.progress.mainline),goal=task.goal;
 // 此处专查购枪指引，已完成小屋休息教学，避免休息入口接管当前操作。
 g.progress.restoration.cottageRested=true;
 g.progress.weapons[1]=1;g.progress.weapon=1;g.progress.weapons[3]=0;
 assert.equal(mainlineCondition(g,goal),false);assert.equal(mainlineOperation(g).type,'buy');assert.equal(mainlineOperation(g).index,3);
 g.progress.weapons[3]=1;assert.equal(mainlineCondition(g,goal),false);assert.equal(mainlineOperation(g).type,'equip');assert.equal(mainlineOperation(g).index,3);
 g.progress.weapon=3;assert.equal(mainlineCondition(g,goal),true);
 assert.equal(task.action.index,3);assert.equal(task.guide.steps[1].action.type,'workshop');assert.equal(task.guide.steps[1].action.index,3);
 assert.ok(task.guide.steps.every(step=>step.label.includes('橡果散弹枪')));assert.doesNotMatch(JSON.stringify(task),/激光|清群武器|任选/);
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
