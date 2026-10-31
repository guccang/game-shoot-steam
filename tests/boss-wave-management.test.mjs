// 领主节点回归：正式接单到场、末批自动开战、胜利停单及失败续接。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,validateProgress} from '../src/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {waveDifficulty,WAVE_REST_SECONDS} from '../src/config/waves.js';
import {BOSSES} from '../src/config/bosses.js';
import {forestReward} from '../src/config/economy.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {clearingArena as arena,enterClearing,summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';

// 比较挑战强度，不把重试后的技能时钟和位置误当成强度变化。
function strength(b){return {kind:b.kind,hp:b.maxHp,damage:b.damage,blast:b.blastDamage,speed:b.speed};}

test('末批清完自动进入领主战并冻结波次，胜利停单，重新接取后续接三秒休整',()=>{
 const g=arena();g.wave=5;g.bossWave=5;g.waveWarning=0;g.waveKills=g.waveSpawned=waveDifficulty(5).total-1;
 const last=g.spawnEnemy(0,100);g.hit(last,1e9);g.updateWaves(.01);
 assert.ok(g.boss);assert.equal(g.bossReady,true);
 const state=[g.wave,g.waveKills,g.waveSpawned,g.waveWarning];
 g.updateWaves(100);assert.deepEqual([g.wave,g.waveKills,g.waveSpawned,g.waveWarning],state);
 g.hit(g.boss,1e9);assert.equal(g.waveRest,WAVE_REST_SECONDS);assert.equal(g.bossReady,false);
 assert.equal(g.progress.living.patrolActive,false);assert.equal(g.waveGroupStart,6);assert.equal(g.bossWave,10);
 g.updateWaves(100);assert.equal(g.wave,5);assert.equal(g.waveRest,3);
 enterClearing(g);g.updateWaves(1);assert.equal(g.wave,5);assert.equal(g.waveRest,2);
 g.updateWaves(2);assert.equal(g.wave,6);assert.equal(g.waveKills,0);assert.equal(g.waveWarning,0);
});

test('普通波间休整与累计击杀不解锁Boss',()=>{
 const g=arena();g.kills=999;g.waveKills=g.waveSpawned=waveDifficulty(1).total;g.waveRest=1.7;
 assert.equal(g.summonBoss(),false);g.updateWaves(.7);assert.equal(g.wave,1);
 g.updateWaves(1);assert.equal(g.wave,2);assert.equal(g.boss,null);assert.equal(g.bossReady,false);
});

test('全部六种现行领主失败、重试和刷新保持节点与相同强度',()=>{
 const kinds=new Set();
 for(let index=0;index<BOSSES.length;index++){
  const g=arena();g.progress.bosses=index;g.roundBosses=index;g.wave=index*5+5;
  assert.ok(summonBossAtNode(g));kinds.add(g.boss.kind);const expected=strength(g.boss);
  g.boss.hp-=20;g.hurt(1e9);assert.equal(g.state,'dead');g.start();
  assert.equal(g.wave,index*5+5);assert.equal(g.bossReady,true);assert.equal(g.boss,null);
  enterClearing(g);g.updateWaves(.01);assert.ok(g.boss);assert.deepEqual(strength(g.boss),expected);
  g.progress.patrol=capturePatrol(g);const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.deepEqual(strength(restored.boss),expected);assert.equal(restored.bossReady,true);
 }
 assert.deepEqual([...kinds].sort(),BOSSES.map(b=>b.id).sort());
});

test('普通怪重开缓和仍不作用于Boss',()=>{
 for(let wave=1;wave<=5;wave++){const a=waveDifficulty(wave),b=waveDifficulty(wave,true);if(wave<=3){assert.ok(b.health<a.health);assert.ok(b.damage<a.damage);}else assert.deepEqual(a,b);assert.equal(a.total,b.total);}
 const a=arena(),b=arena();b.hurt(1e9);assert.equal(b.state,'dead');b.start();assert.equal(b.recoveryRun,true);
 assert.ok(summonBossAtNode(a));assert.ok(summonBossAtNode(b));assert.deepEqual(strength(a.boss),strength(b.boss));
});

test('胜利仅结算一次，下一领主需重新接取及清空下一组，清档恢复正式入职状态',()=>{
 const g=arena();g.wave=5;assert.ok(summonBossAtNode(g));const boss=g.boss,coins=g.progress.coins,reward=forestReward('boss',0,g.progress).coins;
 g.hit(boss,1e9);g.hit(boss,1e9);
 assert.equal(g.progress.bossChallenge,null);assert.equal(g.progress.bosses,1);assert.equal(g.progress.coins,coins+reward);
 g.kills+=100;assert.equal(g.summonBoss(),false);enterClearing(g);g.updateWaves(3);assert.equal(g.summonBoss(),false);
 g.wave=10;assert.ok(summonBossAtNode(g));assert.equal(g.boss.kind,'boar');
 g.resetProgress();assert.deepEqual(g.progress,freshRangerProgress());assert.equal(g.bossReady,false);assert.equal(g.bossWave,5);
});

test('损坏、过期领主强度丢弃，完整白名单恢复',()=>{
 const g=arena();g.wave=5;assert.ok(summonBossAtNode(g));const raw=JSON.parse(JSON.stringify(g.progress));
 assert.ok(raw.bossChallenge);assert.deepEqual(validateProgress(raw).bossChallenge,raw.bossChallenge);
 for(const patch of [{maxHp:Infinity},{speed:0},{damage:'10'},{bosses:999},{blastDamage:-1}])assert.equal(validateProgress({...raw,bossChallenge:{...raw.bossChallenge,...patch}}).bossChallenge,null);
 delete raw.bossChallenge;assert.equal(validateProgress(raw).bossChallenge,null);
});
