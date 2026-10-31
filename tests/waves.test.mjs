// 清档恢复正式入职档；普通战斗夹具仍使用已拥有手枪的历史基础档。
import {freshRangerProgress} from '../src/progression/progress.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
// 无尽波次验证：真实击杀推进、出生配额补刷、暂停冻结与倒下重开。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {waveDifficulty,WAVE_REST_SECONDS} from '../src/config/waves.js';
import {attackProfile} from '../src/combat/enemy-attack.js';

// 固定随机战场，排除自动开火和树干，保留真实刷怪、伤害与死亡流程。
function arena() {const g=new Game(freshProgress(),()=>.5);g.start();g.progress.living.patrolActive=true;Object.assign(g.player,{x:1600,y:400});g.trees=[];g.attackTimer=999;g.waveWarning=0;return g;}

test('所有轮次数量封顶，同屏最多二十四只，通用属性仍正常成长',()=>{
  for(let wave=2;wave<=100;wave++) {
    const a=waveDifficulty(wave-1),b=waveDifficulty(wave);
    assert.ok(b.total>=2);if(wave<=15)assert.ok(b.total<=14);else assert.ok(b.total>=waveDifficulty(wave-5).total);
    assert.ok(b.health>a.health&&b.damage>a.damage);
    assert.ok(b.interval<=a.interval&&b.batch>=a.batch&&b.speed>=a.speed);
    assert.ok(b.total<=40&&b.maxAlive<=24&&b.batch<=8&&b.interval>=.36);
  }
  assert.ok(waveDifficulty(5).interval<waveDifficulty(1).interval);
});

test('五波保留特殊怪编成，后期固定配额而不继续堆怪',()=>{
 const totals=group=>Array.from({length:5},(_,i)=>waveDifficulty((group-1)*5+i+1).total);
 assert.deepEqual(totals(1),[2,4,6,8,10]);assert.deepEqual(totals(2),[4,6,8,10,12]);assert.deepEqual(totals(3),[6,8,10,12,14]);
 assert.deepEqual(totals(4),[8,10,12,14,16]);assert.deepEqual(totals(5),[10,12,14,16,18]);
 assert.deepEqual(totals(6),[12,14,16,18,20]);assert.deepEqual(totals(7),[14,16,18,20,22]);
 assert.deepEqual(totals(8),[16,18,20,22,24]);assert.deepEqual(totals(16),[32,34,36,38,40]);
 for(const group of [20,100,20000])assert.deepEqual(totals(group),[40,40,40,40,40]);
});

test('同区域同阶级怪物按清缴轮数增加伤害，攻击与领主使用真实成长值',()=>{
  const g=arena();g.enemies=[];
  const a=g.spawnEnemy(0,100);g.wave=36;g.progress.bosses=7;const b=g.spawnEnemy(0,100);
  assert.equal(a.biome,b.biome);assert.equal(a.rank,b.rank);assert.equal(a.level,b.level);
  assert.ok(b.maxHp>a.maxHp&&b.damage>a.damage&&b.speed===a.speed);assert.equal(attackProfile(b).damage,b.damage);
  g.kills=12;prepareBossNode(g);assert.ok(g.summonBoss());assert.ok(g.boss.maxHp>850&&g.boss.damage>18&&g.boss.blastDamage>30);
  g.boss.attack=0;g.spawnTimer=999;g.update(.01);assert.equal(g.hazards[0].damage,g.boss.blastDamage);
  const snapshot={...a};g.wave=9;assert.equal(a.hp,snapshot.hp);assert.equal(a.damage,snapshot.damage);
});

test('每波仅生成配额数量，真实击杀全部目标后休整一次并自动进入下一波',()=>{
  const g=arena(),events=[];g.bossWave=5;g.onEvent=(type)=>events.push(type);
  for(let wave=1;wave<=4;wave++) {
    const d=waveDifficulty(wave);
    for(let tick=0;tick<300&&g.waveKills<d.total;tick++){
      g.updateWaves(d.interval);
      assert.ok(g.enemies.filter(e=>e.hp>0).length<=24);
      for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,99999);
    }
    assert.equal(g.waveSpawned,d.total);
    const targets=g.enemies;
    g.hit(targets[0],99999);assert.equal(g.waveKills,d.total);
    g.updateWaves(.01);assert.equal(g.waveRest,WAVE_REST_SECONDS);
    g.updateWaves(1);assert.equal(g.wave,wave);assert.equal(g.waveRest,2);
    g.updateWaves(2);assert.equal(g.wave,wave+1);assert.equal(g.waveSpawned,0);assert.equal(g.waveKills,0);
  }
  assert.equal(events.filter(e=>e==='wave-clear').length,4);assert.equal(events.filter(e=>e==='wave-start').length,4);
});

test('第十六组40只分批入场，满场停刷，击杀后逐只补位且末波能完成',()=>{
 const g=arena();g.wave=80;g.bossWave=80;g.waveSpawned=g.waveKills=0;g.enemies=[];
 const d=waveDifficulty(g.wave);for(let i=0;i<200;i++)g.updateWaves(d.interval);
 assert.equal(g.enemies.length,24);assert.equal(g.waveSpawned,24);
 for(const e of g.enemies.slice(0,5))g.hit(e,999999);
 g.updateWaves(20);assert.equal(g.enemies.filter(e=>e.hp>0).length,20);assert.equal(g.waveSpawned,25);assert.equal(g.bossReady,false);
 for(let tick=0;tick<100&&g.waveKills<d.total;tick++){
  for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,999999);
  if(g.waveKills<d.total)g.updateWaves(.5);
 }
 assert.equal(g.waveKills,40);
 g.updateWaves(.1);assert.equal(g.bossReady,true);
});

test('远离怪物不算通关，回收后退还出生配额并在附近补刷',()=>{
  const g=arena();g.enemies=[];g.waveSpawned=0;g.spawnTimer=999;
  const e=g.spawnEnemy(0,1700);assert.equal(g.waveSpawned,1);g.update(.01);
  assert.ok(!g.enemies.includes(e));assert.equal(g.waveSpawned,0);assert.equal(g.waveKills,0);
  g.spawnTimer=0;g.updateWaves(.01);assert.equal(g.enemies.length,1);assert.equal(g.waveSpawned,1);
  g.hit({id:999,type:'tree',x:950,y:700,hp:1,radius:22},10);assert.equal(g.waveKills,0);
});

test('暂停冻结休整和出生，倒下停止推进，重新出发保留当前波和永久成长',()=>{
  const g=arena();g.wave=8;g.waveRest=2;g.progress.coins=1500;g.progress.weapons[1]=3;g.progress.bosses=2;
  g.pause();g.updateWaves(10);g.update(.05);assert.equal(g.waveRest,2);assert.equal(g.wave,8);
  g.pause();g.hurt(9999);assert.equal(g.state,'dead');g.updateWaves(10);assert.equal(g.wave,8);
  g.start();assert.equal(g.wave,8);assert.equal(g.waveRest,0);assert.equal(g.waveKills,0);assert.equal(g.waveSpawned,0);assert.equal(g.waveWarning,3);
  assert.equal(g.progress.coins,1500);assert.equal(g.progress.weapons[1],3);assert.equal(g.progress.bosses,2);
  g.resetProgress();assert.equal(g.wave,1);assert.deepEqual(g.progress,freshRangerProgress());
});

test('怪物实际扑击仍能击倒残血玩家，死亡后刷怪和波次不再推进',()=>{
  const g=arena();g.wave=15;g.enemies=[];g.waveSpawned=0;g.spawnTimer=999;g.player.hp=1;g.spawnEnemy(0,60);
  for(let i=0;i<300&&g.state==='playing';i++)g.update(.05);
  assert.equal(g.state,'dead');const before=[g.wave,g.waveKills,g.waveSpawned,g.time];g.update(.05);
  assert.deepEqual([g.wave,g.waveKills,g.waveSpawned,g.time],before);
});
