// 清档恢复正式入职档；普通战斗夹具仍使用已拥有手枪的历史基础档。
import {freshRangerProgress} from '../src/progression/progress.js';
import {clearingArena as arena,summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';
// 巡游存档回归：跨刷新恢复、剩余配额、领主强度、死亡与原子清档。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { waveDifficulty } from '../src/config/waves.js';
import { createSaveStore } from '../src/platform/storage.js';
import { createProgressController } from '../src/app/progress-controller.js';
import {forestReward} from '../src/config/economy.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {clearingWaveBudget} from '../src/config/waves.js';

// 模拟一次真实保存和新实例加载，避免复用旧战场对象。
function reload(game) {
  game.progress.patrol = capturePatrol(game);
  return new Game(JSON.parse(JSON.stringify(game.progress)), () => 0.5);
}

test('缩短开局配额后旧档保留奖励与累计击杀，已达标直接休整且未达标只补余量',()=>{
  for(const oldKills of [1,3,4,8,20]){
    const p=freshProgress();p.coins=777;p.wood=333;
    p.patrol={version:1,state:'active',wave:1,waveKills:oldKills,kills:oldKills,bossWave:5,playerHp:120};
    const g=new Game(p,()=>.5);g.progress.living.patrolActive=true;Object.assign(g.player,{x:BOSS_CLEARING.x,y:BOSS_CLEARING.y});g.start();g.trees=[];
    assert.equal(g.waveKills,Math.ceil(Math.min(oldKills,4)/2));assert.equal(g.kills,oldKills);
    assert.equal(g.progress.coins,777);assert.equal(g.progress.wood,333);
    if(oldKills>=3){
      g.updateWaves(.01);assert.equal(g.waveRest,3);assert.equal(g.enemies.length,0);
      g.updateWaves(3);assert.equal(g.wave,2);assert.equal(g.progress.coins,777);
    }else{
      g.updateWaves(3);for(let i=0;i<8;i++)g.updateWaves(1);
      assert.equal(g.enemies.length,2-Math.ceil(oldKills/2));assert.equal(g.waveSpawned,2);assert.equal(g.waveRest,0);
    }
  }
});

test('旧第八轮末批48只按24只迁移，保留结算比例，只补余量并自动进入领主战',()=>{
  for(const oldKills of [25,40,48]){
    const p=freshProgress();p.coins=777;p.wood=333;
    p.bosses=7;p.living.patrolActive=true;p.living.position={x:BOSS_CLEARING.x,y:BOSS_CLEARING.y};
    p.patrol={version:1,waveQuotaVersion:2,state:'active',wave:40,waveGroupStart:36,waveKills:oldKills,kills:oldKills,bossWave:40,playerHp:120};
    const g=new Game(p,()=>.5);g.start();g.trees=[];const migrated=Math.ceil(oldKills/2);
    assert.equal(g.waveKills,migrated);assert.equal(g.kills,oldKills);
    if(oldKills<48){
      g.updateWaves(3);for(let i=0;i<30;i++)g.updateWaves(1);
      assert.equal(g.waveSpawned,24);assert.equal(g.enemies.length,24-migrated);assert.equal(g.bossReady,false);
      for(const enemy of g.enemies)g.hit(enemy,1e9);
    }
    const coins=g.progress.coins;g.updateWaves(.01);
    assert.equal(g.bossReady,true);assert.ok(g.boss);assert.equal(g.progress.coins,coins);
    const budget=clearingWaveBudget(40,p);
    assert.equal(g.progress.coins,777+budget.coins-Math.floor(migrated*budget.coins/24));
    assert.equal(g.progress.wood,333+budget.wood-Math.floor(migrated*budget.wood/24));
    const restored=reload(g);assert.equal(restored.waveKills,24);assert.equal(restored.progress.coins,coins);
  }
});

test('刷新保留普通波次、击杀与挑战资格，只重建剩余配额', () => {
  const g = arena();
  Object.assign(g, {
    wave: 8,
    bossWave: 10,
    waveKills: waveDifficulty(8).total - 2,
    kills: 160,
    bossKillsAt: 145,
    roundBosses: 3,
    chopped: 9,
  });
  g.progress.bosses = 3;
  g.player.hp = 72;
  const restored = reload(g);
  assert.equal(restored.state, 'paused');
  for (const key of ['wave', 'waveKills', 'kills', 'bossKillsAt', 'roundBosses', 'chopped'])
    assert.equal(restored[key], g[key]);
  assert.equal(restored.player.hp, 72);
  assert.equal(restored.enemies.length, 0);
  assert.equal(restored.waveSpawned, waveDifficulty(8).total - 2);
  assert.equal(restored.waveWarning, 3);
  restored.pause();
  restored.trees = []; restored.updateWaves(3);
  restored.updateWaves(2); restored.updateWaves(2);
  assert.equal(restored.enemies.length, 2);
  assert.equal(restored.waveSpawned, waveDifficulty(8).total);
  assert.ok(restored.enemies.every((e) => e.wave === 8));
  for (const enemy of restored.enemies) restored.hit(enemy, 1e9);
  restored.updateWaves(0.01);
  assert.equal(restored.waveRest, 3);
  restored.updateWaves(3);
  assert.equal(restored.wave, 9);
  assert.equal(restored.summonBoss(), false);
});

test('休整倒计时跨刷新保持且只推进一次，不重新刷已清完的波次', () => {
  const g = arena();
  g.wave = 4;
  g.waveKills = waveDifficulty(4).total;
  g.waveRest = 1.25;
  const restored = reload(g);
  assert.equal(restored.waveRest, 1.25);
  assert.equal(restored.enemies.length, 0);
  restored.updateWaves(10);
  assert.equal(restored.wave, 4);
  restored.pause();
  restored.updateWaves(1);
  assert.equal(restored.waveRest, 0.25);
  const again = reload(restored);
  again.pause();
  again.updateWaves(0.25);
  assert.equal(again.wave, 5);
  assert.equal(again.waveKills, 0);
});

test('领主战跨刷新保持身份、血量、强度及本轮领主序号，胜利不重复奖励', () => {
  const g = arena();
  Object.assign(g, { wave: 6, kills: 37, roundBosses: 2, bossKillsAt: 24 });
  g.progress.bosses = 2;
  assert.ok(summonBossAtNode(g));
  g.boss.hp -= 150;
  const restored = reload(g);
  for (const key of ['kind', 'hp', 'maxHp', 'speed', 'damage', 'blastDamage'])
    assert.equal(restored.boss[key], g.boss[key]);
  assert.equal(restored.roundBosses, 2);
  restored.pause();
  restored.updateWaves(10);
  assert.equal(restored.wave, 6);
  const boss = restored.boss,
    before = restored.progress.coins,reward=forestReward('boss',0,restored.progress).coins;
  restored.hit(boss, 1e9);
  restored.hit(boss, 1e9);
  assert.equal(restored.progress.coins, before + reward);
  const after = reload(restored);
  assert.equal(after.boss, null);
  assert.equal(after.progress.bosses, 3);
  assert.equal(after.roundBosses, 3);
  assert.equal(after.bossKillsAt, Math.max(37,waveDifficulty(6).total));
  after.pause();
  assert.equal(after.summonBoss(), false);
});

test('领主死亡刷新仍需手动重试，节点与领主强度保持，清档清除所有巡游记录', () => {
  const g = arena();
  g.wave = 9;
  g.kills = 12;
  assert.ok(summonBossAtNode(g));
  const strength = structuredClone(g.progress.bossChallenge);
  g.hurt(1e9);
  const restored = reload(g);
  assert.equal(restored.state, 'dead');
  assert.equal(restored.player.hp, 0);
  restored.start();
  assert.equal(restored.wave, 9);
  assert.equal(restored.recoveryRun, true);
  assert.deepEqual(restored.progress.bossChallenge, strength);
  const again = reload(restored);
  assert.equal(again.wave, 9);
  assert.equal(again.recoveryRun, true);
  again.resetProgress();
  assert.deepEqual(again.progress, freshRangerProgress());
  assert.equal(reload(again).state, 'ready');
});

test('旧档保持成长，损坏巡游字段有界回退，伪造活跃领主不生成新强度', () => {
  const old = freshProgress();
  delete old.patrol;
  old.bosses = 4;
  old.coins = 999;
  const restored = new Game(old, () => 0.5);
  assert.equal(restored.wave, 1);
  assert.equal(restored.progress.bosses, 4);
  assert.equal(restored.progress.coins, 999);
  const bad = validateProgress({
    ...old,
    patrol: {
      version: 1,
      state: 'active',
      wave: Infinity,
      waveKills: -50,
      kills: NaN,
      waveRest: 1e9,
      spawnTimer: -8,
      bossKillsAt: 999,
      bossHp: 999,
    },
  });
  assert.equal(bad.patrol.wave, 1);
  assert.equal(bad.patrol.waveKills, 0);
  assert.equal(bad.patrol.waveRest, 0);
  assert.equal(bad.patrol.bossKillsAt, 0);
  assert.equal(new Game(bad, () => 0.5).boss, null);
  assert.equal(validateProgress({ ...old, patrol: { version: 99 } }).patrol, null);
});

test('存档控制器定时保存、解锁保持最新波次、失败不清档、成功清档刷新后不复活', () => {
  const values = new Map();
  let blocked = false,
    writes = 0;
  const store = createSaveStore(() => ({
    getItem: (key) => values.get(key),
    setItem: (key, value) => {
      if (blocked) throw Error('存储失败');
      values.set(key, value);
      writes++;
    },
  }));
  const game = arena(),
    label = {};
  const controller = createProgressController({
    game,
    store,
    root: { getElementById: () => label },
    input: { reset() {} },
    dialogs: { cancelResume() {} },
    inventory: { reset() {} },
    refresh() {},
    toast: { show() {} },
  });
  game.wave = 7;
  controller.checkpoint(1);
  assert.equal(writes, 0);
  controller.checkpoint(1);
  assert.equal(store.loadProgress().patrol.wave, 7);
  game.wave = 8;
  assert.ok(controller.unlockWeapons());
  assert.equal(store.loadProgress().patrol.wave, 8);
  game.pause();
  controller.checkpoint(10);
  assert.equal(writes, 2);
  blocked = true;
  const before = structuredClone(game.progress);
  assert.equal(controller.resetProgress(), false);
  assert.deepEqual(game.progress, before);
  blocked = false;
  assert.ok(controller.resetProgress());
  controller.save();
  assert.deepEqual(store.loadProgress(), freshRangerProgress());
  assert.equal(new Game(store.loadProgress(), () => 0.5).wave, 1);
});
