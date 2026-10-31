// 清缴难度与密度回归：正式属性工厂、旧档奖励比例及现场名额共用同一套运行逻辑。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
import {clearingEnemyHealth} from '../src/config/clearing-damage.js';
import {waveDifficulty,legacyWaveTotal,clearingWaveBudget,CLEARING_MIX_MINIMUM,PREVIOUS_CLEARING_WAVE_CAPS,PREVIOUS_V4_WAVE_CAPS,CLEARING_QUOTA_VERSION} from '../src/config/waves.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';
import {capturePatrol} from '../src/core/patrol-session.js';

// 保留真实工厂与障碍选点，仅固定种子、清缴位置及目标轮数。
function arena(round=7){
 const p=freshProgress();p.bosses=round;
 const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;
 Object.assign(g.player,{x:1600,y:400});g.wave=round*5+5;g.bossWave=g.wave;
 g.waveSpawned=g.waveKills=g.waveWarning=0;g.enemies=[];return g;
}

test('前两轮减少生命预算，第三轮起保持成长并封顶，切换装备不抬高敌人',()=>{
 for(let w=1;w<=15;w++)assert.ok(Math.abs(clearingEnemyHealth(Math.floor((w-1)/5),w)-waveDifficulty(w).health*([.49,.85][Math.floor((w-1)/5)]??1))<1e-10);
 assert.ok(clearingEnemyHealth(7,40)>waveDifficulty(40).health*2);
 assert.equal(clearingDifficulty(30).health,clearingDifficulty(100000).health);
 const g=arena(),a=g.spawnEnemy(0,0,{x:1700,y:400});
 g.progress.weapon=9;g.progress.weapons[9]=20;g.progress.heroes[0]=20;g.vehicle.active=true;
 g.waveSpawned=0;const b=g.spawnEnemy(0,0,{x:1700,y:400});
 assert.equal(b.hp,a.hp);assert.equal(b.damage,a.damage);
 g.progress.patrol=capturePatrol(g);const restored=new Game(structuredClone(g.progress),()=>.5);
 restored.waveSpawned=0;const c=restored.spawnEnemy(0,0,{x:1700,y:400});assert.equal(c.hp,a.hp);
});

test('残留怪与环境怪共同占用二十四个名额，低帧率最多补一组',()=>{
 const g=arena();
 for(let i=0;i<24;i++)g.spawnEnemy(0,0,{x:1700+i*4,y:500},{ambient:true});
 for(let i=0;i<40;i++)g.updateWaves(1);
 assert.equal(g.waveSpawned,0);
 g.enemies[0].hp=0;g.updateWaves(20);assert.equal(g.waveSpawned,1);
 assert.equal(g.enemies.filter(e=>e.hp>0).length,24);
 g.enemies.forEach(e=>{e.hp=0;});g.updateWaves(20);assert.ok(g.waveSpawned>1&&g.waveSpawned<=7);
});

test('后期旧档缩减为40只时保留已结算比例，刷新幂等且不会重发预算',()=>{
 for(const wave of [40,60,100,100000])for(const state of ['active','dead']){
  const previous=legacyWaveTotal(wave),total=waveDifficulty(wave).total;
  for(const kills of [0,1,Math.floor(previous*.4),previous-1,previous]){
   const raw={version:1,waveQuotaVersion:2,state,wave,waveKills:kills,kills,bossWave:wave,bossReady:kills===previous};
   const saved=validatePatrol(raw);
   assert.equal(saved.waveKills,Math.ceil(kills*total/previous));assert.equal(saved.waveQuotaVersion,CLEARING_QUOTA_VERSION);
   assert.deepEqual(validatePatrol(saved),saved);assert.equal(saved.bossReady,raw.bossReady);
   for(const budget of Object.values(clearingWaveBudget(wave))){
    const alreadyPaid=Math.floor(kills*budget/previous),remaining=budget-Math.floor(saved.waveKills*budget/total);
    assert.ok(alreadyPaid+remaining<=budget);
   }
  }
 }
 const completed=validatePatrol({version:1,waveQuotaVersion:2,state:'active',wave:39,waveKills:legacyWaveTotal(39),waveRest:2});
 assert.equal(completed.waveKills,waveDifficulty(39).total);assert.equal(completed.waveRest,2);
});

test('版本3与4调整配额保留完成比例、休整与领主节点，重复读取不补发奖励',()=>{
 for(const version of [3,4])for(let wave=1;wave<=100;wave++)for(const state of ['active','dead']){
  const slot=(wave-1)%5,previous=Math.min((version===3?PREVIOUS_CLEARING_WAVE_CAPS:PREVIOUS_V4_WAVE_CAPS)[slot],Math.max(CLEARING_MIX_MINIMUM[slot],legacyWaveTotal(wave)));
  const total=waveDifficulty(wave).total;
  for(const kills of [0,1,Math.floor(previous/2),previous-1,previous])for(const node of ['combat','rest','boss']){
   const complete=kills===previous;
   const raw={version:1,waveQuotaVersion:version,state,wave,waveKills:kills,kills:1000,bossWave:wave,bossReady:complete&&node==='boss',waveRest:complete&&node==='rest'?2:0};
   const saved=validatePatrol(raw);
   assert.equal(saved.waveKills,Math.ceil(kills*total/previous));assert.equal(saved.waveQuotaVersion,CLEARING_QUOTA_VERSION);
   assert.equal(saved.kills,1000);assert.equal(saved.bossReady,raw.bossReady);assert.equal(saved.waveRest,raw.waveRest);
   assert.deepEqual(validatePatrol(saved),saved);
   for(const budget of Object.values(clearingWaveBudget(wave))){
    const alreadyPaid=Math.floor(kills*budget/previous),remaining=budget-Math.floor(saved.waveKills*budget/total);
    assert.ok(alreadyPaid+remaining<=budget);
   }
  }
 }
});

test('新配额保存与恢复使用当前版本，当前波进度不被二次放大',()=>{
 const g=arena();g.waveKills=g.waveSpawned=17;g.kills=200;
 const saved=capturePatrol(g);assert.equal(saved.waveQuotaVersion,CLEARING_QUOTA_VERSION);
 assert.equal(validatePatrol(saved).waveKills,17);
 g.progress.patrol=saved;const restored=new Game(structuredClone(g.progress),()=>.5);
 assert.equal(restored.waveKills,17);assert.equal(restored.waveSpawned,17);
});
