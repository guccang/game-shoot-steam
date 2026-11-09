// 首次清缴数值与旧档迁移专项：接单、出生、击杀、领主和刷新均走正式运行时。
import test from 'node:test';
import assert from 'node:assert/strict';
import {enterClearing} from './helpers/clearing-scene.mjs';
import {waveDifficulty,CLEARING_QUOTA_VERSION,clearingWaveBudget,clearingKillReward} from '../src/config/waves.js';
import {clearingEnemyHealth} from '../src/config/clearing-damage.js';
import {clearingBossHealth,CLEARING_BOSS_HEALTH_VERSION} from '../src/config/clearing-boss.js';
import {validatePatrol} from '../src/progression/battle/patrol-progress.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {waveProgressState} from '../src/ui/wave-progress.js';

// 只补齐首次清缴前的告示牌修复前置，接单和到场仍使用正式入口。
function clearingArena(){const p=freshProgress();p.restoration.repaired=['clearing'];const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=99999;enterClearing(g);g.enemies=[];g.attackTimer=999;return g;}

// 用正式波次调度和致死命中验证配额，快进击杀不代表玩家战斗耗时。
function clearRound(g){
 const rows=[],first=g.wave,last=first+4;
 for(let wave=first;wave<=last;wave++){
  let spawned=0;
  for(let i=0;i<600&&g.waveRest===0&&!g.boss;i++){
   g.updateWaves(.1);
   for(const e of g.enemies)if(e.hp>0&&e.wave===wave){spawned++;g.hit(e,e.hp);}
  }
  rows.push(spawned);assert.equal(g.waveKills,waveDifficulty(wave).total);
  assert.equal(waveProgressState(g).count,5);assert.equal(waveProgressState(g).completed,wave-first+1);
  if(wave<last)g.updateWaves(3);
 }
 return rows;
}

test('前两次清缴整波减量30%，第三次恢复，五波后仍出现领主且只结算一次',()=>{
 const g=clearingArena();assert.deepEqual(clearRound(g),[4,7,10,13,17]);assert.equal(g.boss.hp,1122);assert.equal(g.boss.maxHp,1122);
 const boss=g.boss;g.hit(boss,1e9);const coins=g.progress.coins;g.hit(boss,1e9);assert.equal(g.progress.coins,coins);assert.equal(g.progress.bosses,1);assert.equal(g.progress.living.patrolActive,false);
 enterClearing(g);g.updateWaves(3);assert.equal(g.wave,6);assert.equal(waveDifficulty(g.wave).total,7);assert.equal(clearingBossHealth(1),1553);
 assert.deepEqual(clearRound(g),[7,10,13,15,20]);assert.equal(g.boss.hp,1553);g.hit(g.boss,1e9);assert.equal(g.progress.bosses,2);
 enterClearing(g);g.updateWaves(3);assert.equal(g.wave,11);assert.deepEqual(clearRound(g),[14,18,22,26,32]);assert.ok(g.boss);
});

test('首轮普通怪生命在现有预算上再降30%，后续配额增加但生命成长预算不变',()=>{
 for(let wave=1;wave<=5;wave++)for(const retry of [false,true])assert.ok(Math.abs(clearingEnemyHealth(0,wave,retry)/waveDifficulty(wave,retry).health-.49)<1e-10);
 for(let wave=1;wave<=100;wave++){
  const normal=Math.min(64,[6,10,14,18,24][(wave-1)%5]+4*Math.floor((wave-1)/5));
  for(const retry of [false,true])assert.equal(waveDifficulty(wave,retry).total,wave<=10?Math.round(normal*.7):normal);
 }
 for(let wave=6;wave<=10;wave++)assert.ok(Math.abs(clearingEnemyHealth(1,wave)/waveDifficulty(wave).health-.85)<1e-10);
 const g=clearingArena();g.waveWarning=0;const enemy=g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y});assert.ok(enemy.hp>0);assert.equal(enemy.hp,enemy.maxHp);
});

test('版本5首轮按完成比例缩减，休整与领主节点保留，重载幂等且不增加剩余奖励',()=>{
 for(let wave=1;wave<=10;wave++)for(const state of ['active','dead']){
  const oldTotal=Math.min(40,[2,4,6,8,10][(wave-1)%5]+2*Math.floor((wave-1)/5)),total=waveDifficulty(wave).total;
  for(let kills=0;kills<=oldTotal;kills++){
   const raw={version:1,waveQuotaVersion:5,state,wave,waveKills:kills,kills:100,bossWave:5,waveGroupStart:1,bossReady:wave===5&&kills===oldTotal,waveRest:wave<5&&kills===oldTotal?2:0};
   const saved=validatePatrol(raw);assert.equal(saved.waveQuotaVersion,CLEARING_QUOTA_VERSION);assert.equal(saved.waveKills,Math.ceil(kills*total/oldTotal));assert.equal(saved.bossReady,raw.bossReady);assert.equal(saved.waveRest,raw.waveRest);assert.deepEqual(validatePatrol(saved),saved);
   for(const budget of Object.values(clearingWaveBudget(wave)))assert.ok(budget-Math.floor(saved.waveKills*budget/total)<=budget-Math.floor(kills*budget/oldTotal));
  }
 }
});

test('版本7前两轮按新配额迁移，第三轮不变，已结算奖励与战绩不会重复增加',()=>{
 for(let wave=1;wave<=15;wave++)for(const state of ['active','dead']){
  const oldTotal=[6,10,14,18,24][(wave-1)%5]+4*Math.floor((wave-1)/5),total=waveDifficulty(wave).total;
  for(let kills=0;kills<=oldTotal;kills++){
   const raw={version:1,waveQuotaVersion:7,state,wave,waveKills:kills,kills:100+ kills,bossWave:Math.ceil(wave/5)*5,waveGroupStart:Math.floor((wave-1)/5)*5+1,bossReady:wave%5===0&&kills===oldTotal,waveRest:wave%5!==0&&kills===oldTotal?2:0};
   const saved=validatePatrol(raw);assert.equal(saved.waveQuotaVersion,8);assert.equal(saved.waveKills,Math.ceil(kills*total/oldTotal));assert.equal(saved.kills,raw.kills);assert.equal(saved.bossReady,raw.bossReady);assert.equal(saved.waveRest,raw.waveRest);assert.deepEqual(validatePatrol(saved),saved);
   for(const budget of Object.values(clearingWaveBudget(wave)))assert.ok(budget-Math.floor(saved.waveKills*budget/total)<=budget-Math.floor(kills*budget/oldTotal));
  }
 }
});

test('减量后的每波奖励仍完整分摊，刷新与死亡只重建剩余配额',()=>{
 for(let wave=1;wave<=15;wave++){
  const total=waveDifficulty(wave).total,budget=clearingWaveBudget(wave);
  for(const key of ['coins','wood','attempts'])assert.equal(Array.from({length:total},(_,i)=>clearingKillReward(wave,i)[key]).reduce((sum,n)=>sum+n,0),budget[key]);
 }
 for(const wave of [1,6,11]){
  const g=clearingArena();g.wave=g.waveGroupStart=wave;g.bossWave=wave+4;g.waveKills=2;g.waveSpawned=waveDifficulty(wave).total;
  const raw=structuredClone(g.progress);raw.patrol=capturePatrol(g);
  const restored=new Game(raw,()=>.5);assert.equal(restored.waveKills,2);assert.equal(restored.waveSpawned,2);
  restored.start();restored.hurt(1e9);restored.start();assert.equal(restored.wave, wave);assert.equal(restored.waveKills,2);assert.equal(restored.waveSpawned,2);
 }
});

test('版本5的365生命受伤Boss按剩余比例调整为1122，刷新与重试保持新预算',()=>{
 const g=clearingArena();clearRound(g);g.progress.patrol=capturePatrol(g);const raw=structuredClone(g.progress);
 raw.bossChallenge.clearingHealthVersion=5;raw.bossChallenge.maxHp=365;raw.patrol.bossHp=146;
 const saved=validateProgress(raw);assert.equal(saved.bossChallenge.maxHp,1122);assert.equal(saved.patrol.bossHp,448.8);assert.equal(saved.bossChallenge.clearingHealthVersion,CLEARING_BOSS_HEALTH_VERSION);assert.deepEqual(validateProgress(saved),saved);assert.equal(raw.bossChallenge.maxHp,365);
 const loaded=new Game(saved,()=>.5);assert.equal(loaded.boss.maxHp,1122);assert.equal(loaded.boss.hp,448.8);loaded.start();loaded.hurt(1e9);loaded.start();enterClearing(loaded);assert.ok(loaded.summonBoss());assert.equal(loaded.boss.maxHp,1122);
});
