import {freshRangerProgress} from '../src/progression/progress.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
import {clearingSite} from '../src/progression/story/clearing-site.js';
// 死亡续游保留累计数据，保留当前波与配额；清档仍是唯一完整归零入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { capturePatrol } from '../src/core/battle/patrol-session.js';
import { waveDifficulty } from '../src/config/waves.js';

// 使用用户截图中的累计数据，构造拥有装备、熟练度与独立炮塔的中后期存档。
function arena(wave = 15) {
  const p = freshProgress();
  Object.assign(p, { bosses: 3, coins: 57299, wood: 857 });
  p.weapons[2] = 20; p.mastery[2] = 550; p.mods[2] = 1;
  p.vehicleHulls[0] = 8; p.vehicleWeapons[14] = 4;
  const g = new Game(p, () => 0.5);
  g.start();
  Object.assign(g, { wave, waveGroupStart: Math.max(1,wave-2), bossWave: wave+1, waveKills: 7, waveRest: 0, kills: 115, chopped: 307,
    roundBosses: 3, bossKillsAt: 100, time: 200 });
  returnToBattle(g);
  return g;
}

// 回城是安全区，测试后续战斗须回到本次清缴地点，不能再用历史固定坐标。
function returnToBattle(g){g.progress.living.patrolActive=true;Object.assign(g.player,clearingSite(g.progress),{invincible:0});g.vehicle.active=false;}
// 只跳过刷怪前置，仍使用正式清缴位置和领主创建流程。
function summonBossAtNode(g){returnToBattle(g);prepareBossNode(g);return g.summonBoss();}

// 浏览器同一 JSON 保存成长与巡游快照，死亡和继续后的加载走同一生产入口。
function reload(g) {
  g.progress.patrol = capturePatrol(g);
  return new Game(JSON.parse(JSON.stringify(g.progress)), () => 0.5);
}

test('第15波死亡保留当前波与已击杀配额，新怪仍按第15波出生', () => {
  const g = arena(), before = structuredClone(g.progress);
  g.hurt(1e9);
  assert.equal(g.state, 'dead'); assert.equal(g.wave, 15);
  g.start();
  assert.equal(g.state, 'playing'); assert.equal(g.wave, 15);
  assert.equal(g.progress.economyLog.events.at(-1).type,'challenge-failed');
  assert.equal(g.progress.coins,51570);assert.equal(g.progress.economyLog.expense['death:coins:coins'],5729);
  assert.deepEqual({...g.progress,coins:before.coins,living:before.living,economyLog:before.economyLog}, before);
  assert.deepEqual([g.kills, g.chopped, g.roundBosses, g.bossKillsAt, g.time], [115, 307, 3, 100, 200]);
  assert.equal(g.waveKills, 7); assert.equal(g.waveRest, 0); assert.equal(g.waveSpawned, 7);
  assert.equal(g.waveWarning, 3);
  assert.equal(g.player.hp, g.maxHp());
  returnToBattle(g);g.trees = []; g.updateWaves(3); g.updateWaves(3);
  assert.ok(g.enemies.length>0);
  assert.ok(g.enemies.every(e => e.wave === 15));
  const control = arena(15); control.enemies = []; control.waveSpawned = 7; control.recoveryRun = true;
  const expected = control.spawnEnemy(0, 0, { x: g.enemies[0].x, y: g.enemies[0].y });
  assert.equal(g.enemies[0].maxHp, expected.maxHp);
  assert.equal(g.enemies[0].damage, expected.damage);
  assert.equal(g.summonBoss(), false, '普通波次的累计击杀不再解锁领主');
});

test('死亡前后刷新、重复开始与连续死亡均保留波次及配额', () => {
  let g = arena();
  g.hurt(1e9); g = reload(reload(g));
  assert.equal(g.state, 'dead'); assert.equal(g.wave, 15);
  g.start(); g.start(); assert.equal(g.wave, 15);
  g = reload(reload(g));
  assert.equal(g.state, 'paused'); assert.equal(g.wave, 15);
  assert.deepEqual([g.kills, g.chopped, g.roundBosses, g.bossKillsAt], [115, 307, 3, 100]);
  g.start(); returnToBattle(g);g.hurt(1e9); g.start();
  assert.equal(g.wave, 15);
  assert.equal(g.kills, 115); assert.equal(g.chopped, 307); assert.equal(g.roundBosses, 3);
});

test('前五波休整中死亡保留已完成进度，休整只推进一次', () => {
  for (const wave of [1, 2, 3, 4, 5]) {
    const g = arena(wave);
    g.waveKills = waveDifficulty(wave).total; g.waveRest = 2;
    g.hurt(1e9); g.start();
    assert.equal(g.wave, wave);
    assert.equal(g.waveKills, waveDifficulty(wave).total); assert.equal(g.waveRest, 2);
    returnToBattle(g);g.updateWaves(0.01);
    assert.equal(g.wave, wave);
    g.updateWaves(2);assert.equal(g.wave,wave+1);assert.equal(g.waveKills,0);
  }
});

test('Boss战死亡保留战绩与强度快照，重试仍满血；普通击杀和伐木继续累计', () => {
  const g = arena();
  summonBossAtNode(g); g.boss.hp -= 100;
  const challenge = structuredClone(g.progress.bossChallenge);
  g.hurt(1e9); const next = reload(g); next.start();
  assert.deepEqual(next.progress.bossChallenge, challenge);
  assert.equal(next.roundBosses, 3); assert.equal(summonBossAtNode(next), true);
  assert.equal(next.boss.hp, challenge.maxHp);
  const enemy = next.spawnEnemy(0, 300), tree = next.trees[0];
  next.hit(enemy, 1e9); next.hit(tree, 1e9);
  assert.equal(next.kills, 116); assert.equal(next.chopped, 308);
  const boss = next.boss;
  next.hit(boss, 1e9); next.hit(boss, 1e9);
  assert.equal(next.roundBosses, 4); assert.equal(next.progress.bosses, 4);
  assert.equal(next.bossKillsAt, 116);
});

test('只有显式清空进度才归零统计、波次和成长，刷新不会恢复旧数据', () => {
  const g = arena();
  g.hurt(1e9); g.start(); g.resetProgress();
  assert.equal(g.state, 'ready'); assert.equal(g.wave, 1);
  assert.deepEqual([g.kills, g.chopped, g.roundBosses, g.bossKillsAt], [0, 0, 0, 0]);
  assert.deepEqual(g.progress, freshRangerProgress());
  const next = reload(g);
  assert.equal(next.wave, 1); assert.equal(next.kills, 0); assert.equal(next.chopped, 0);
});
