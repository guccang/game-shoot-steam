import {clearingDifficulty} from '../src/config/clearing-difficulty.js';
// 前三领主的生命预算、后续成长与重试续接，仅使用正式清缴工厂。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {waveDifficulty} from '../src/config/waves.js';
import {clearingBossHealth,CLEARING_BOSS_HEALTH_VERSION} from '../src/config/clearing-boss.js';
import {capturePatrol} from '../src/core/patrol-session.js';
// 在真实清缴场准备已完成的五波节点，不绕过领主属性创建逻辑。
function challenge(index){const p=freshProgress();p.bosses=index;const g=new Game(p,()=>.5);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.wave=index*5+5;g.waveGroupStart=index*5+1;g.bossWave=g.wave;g.waveKills=g.waveSpawned=waveDifficulty(g.wave).total;g.bossReady=true;g.roundBosses=index;assert.ok(g.summonBoss());return g;}
test('前三次清缴生命预算生效，攻击缓慢成长且技能顺序不变',()=>{
 for(let i=0;i<3;i++){const g=challenge(i),d=clearingDifficulty(i);assert.equal(g.boss.maxHp,[1122,1553,1985][i]);assert.equal(g.boss.damage,Math.round(18*d.damage));assert.equal(g.boss.blastDamage,Math.round(30*d.damage));assert.equal(g.boss.kind,['dumpling','boar','mushroom'][i]);}
});

test('前五轮预算保持，第六至八轮逐步补强，之后仍按原曲线平滑成长',()=>{
 for(let round=1;round<=30;round++){
  const previous=clearingBossHealth(round-1),current=clearingBossHealth(round);
  assert.ok(Number.isInteger(current)&&current>previous,`第${round+1}轮应递增`);
  assert.ok(current/previous<=(round>=5&&round<=7?2.5:1.51),`第${round+1}轮增长过快：${previous}→${current}`);
 }
 assert.equal(clearingBossHealth(31),1242000);
 // 普通怪的生命及攻击锚点继续使用原线性插值。
 assert.ok(Math.abs(clearingDifficulty(5).health-7.2)<1e-12);
 assert.ok(Math.abs(clearingDifficulty(5).damage-1.8)<1e-12);
});

test('进行中的第二轮使用新预算，保留受伤比例且刷新不回血',()=>{
 const g=challenge(1);g.progress.patrol=capturePatrol(g);
 const raw=structuredClone(g.progress);raw.bossChallenge.clearingHealthVersion=4;
 raw.bossChallenge.maxHp=2000;raw.patrol.bossHp=1000;
 const saved=validateProgress(raw),loaded=new Game(saved,()=>.5);
 assert.equal(loaded.boss.maxHp,1553);assert.equal(loaded.boss.hp,776.5);
 assert.deepEqual(validateProgress(saved),saved);
});
test('第四个及以后领主按轮数独立成长，第八轮28980，长期1242000封顶',()=>{
 for(const [i,hp] of [[3,1250],[4,1350],[7,4200],[12,18000],[20,120000],[100,180000]]){const g=challenge(i);assert.equal(g.boss.maxHp,Math.round(Math.round(hp*115/100)*1.5)*(i>=7?4:1));assert.equal(g.boss.damage,Math.round(18*clearingDifficulty(i).damage));}
});
test('第三领主受伤刷新与死亡重试保持同一生命预算，胜利不重复发奖',()=>{
 let g=challenge(2);g.boss.hp-=100;g.progress.patrol=capturePatrol(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);assert.equal(g.boss.maxHp,1985);assert.equal(g.boss.hp,1885);g.start();g.hurt(1e9);g.start();Object.assign(g.player,{x:1600,y:400});assert.ok(g.summonBoss());assert.equal(g.boss.maxHp,1985);const b=g.boss;g.hit(b,1e9);const coins=g.progress.coins;g.hit(b,1e9);assert.equal(g.progress.coins,coins);assert.equal(g.progress.bosses,3);assert.equal(g.progress.living.patrolActive,false);
});

test('旧清缴挑战按剩余比例升级一次，迁移攻击且反复刷新不回血、不重复发奖',()=>{
 const g=challenge(7);g.progress.patrol=capturePatrol(g);
 const raw=structuredClone(g.progress),old=raw.bossChallenge;
 old.clearingHealthVersion=1;old.maxHp=2280;old.damage=21;old.blastDamage=34;raw.patrol.bossHp=912;
 const expected=structuredClone(raw),saved=validateProgress(raw);
 assert.equal(saved.bossChallenge.maxHp,28980);assert.equal(saved.patrol.bossHp,11592);
 assert.equal(saved.bossChallenge.clearingHealthVersion,CLEARING_BOSS_HEALTH_VERSION);
 assert.equal(saved.bossChallenge.damage,43);assert.equal(saved.bossChallenge.blastDamage,72);
 for(const field of ['speed','kind'])assert.equal(saved.bossChallenge[field],old[field]);
 for(const field of ['bosses','coins','wood','weapons','heroes'])assert.deepEqual(saved[field],raw[field]);
 assert.deepEqual(raw,expected);assert.deepEqual(validateProgress(structuredClone(saved)),saved);
 const loaded=new Game(saved,()=>.5);assert.equal(loaded.boss.hp,11592);assert.equal(loaded.boss.maxHp,28980);
});

test('未带清缴标记的其他地图快照不迁移，旧失败挑战再次召唤时迁移',()=>{
 const g=challenge(7),raw=structuredClone(g.progress);
 delete raw.bossChallenge.clearingHealthVersion;raw.bossChallenge.maxHp=2280;raw.mapId='jiuzhaigou';
 assert.equal(validateProgress(raw).bossChallenge.maxHp,2280);
 g.boss=null;g.progress.living.patrolActive=true;delete g.progress.bossChallenge.clearingHealthVersion;g.progress.bossChallenge.maxHp=2280;
 assert.ok(g.summonBoss());assert.equal(g.boss.hp,clearingBossHealth(7));
});

test('版本2首领按剩余比例降到当前1122并去掉旧加速，重复恢复不回血',()=>{
 const g=challenge(0);g.progress.patrol=capturePatrol(g);
 const raw=structuredClone(g.progress);
 Object.assign(raw.bossChallenge,{clearingHealthVersion:2,maxHp:2400,speed:99});raw.patrol.bossHp=1200;
 const saved=validateProgress(raw);
 assert.equal(saved.bossChallenge.maxHp,1122);assert.equal(saved.patrol.bossHp,561);
 assert.equal(saved.bossChallenge.speed,34);assert.equal(saved.bossChallenge.clearingHealthVersion,CLEARING_BOSS_HEALTH_VERSION);
 assert.deepEqual(validateProgress(saved),saved);assert.equal(raw.patrol.bossHp,1200);
 const loaded=new Game(saved,()=>.5);assert.equal(loaded.boss.hp,561);assert.equal(loaded.boss.speed,34);
});

// 版本8在途挑战按最新轮次预算迁移，保留半血且不会在连续读档中重复放大。
test('版本8清缴领主按当前轮次迁移，半血存档只迁移一次',()=>{
 for(const [round,oldHp] of [[0,748],[1,1035],[2,1323],[7,4830]]){
  const g=challenge(round);g.progress.patrol=capturePatrol(g);
  const raw=structuredClone(g.progress);
  Object.assign(raw.bossChallenge,{clearingHealthVersion:8,maxHp:oldHp});raw.patrol.bossHp=oldHp/2;
  const saved=validateProgress(raw);
  assert.equal(saved.bossChallenge.maxHp,clearingBossHealth(round));
  assert.equal(saved.patrol.bossHp,saved.bossChallenge.maxHp/2);
  assert.deepEqual(validateProgress(saved),saved);
 }
});

// 上一版本的实际中后期存档按剩余比例升级，失败后重试与反复读档不会再次加血。
test('版本9第六轮起按新预算迁移，前五轮不变且重复读取幂等',()=>{
 for(const [round,oldHp,newHp] of [[4,2330,2330],[5,3401,5102],[6,4964,12410],[7,7245,28980],[9,12968,51872],[30,310500,1242000]]){
  const g=challenge(round);g.progress.patrol=capturePatrol(g);const raw=structuredClone(g.progress);
  Object.assign(raw.bossChallenge,{clearingHealthVersion:9,maxHp:oldHp});raw.patrol.bossHp=oldHp*.4;
  const saved=validateProgress(raw);assert.equal(saved.bossChallenge.maxHp,newHp);assert.ok(Math.abs(saved.patrol.bossHp-newHp*.4)<1e-8);
  for(const field of ['bosses','coins','wood','weapons','heroes'])assert.deepEqual(saved[field],raw[field]);
  assert.deepEqual(validateProgress(structuredClone(saved)),saved);
 }
});
