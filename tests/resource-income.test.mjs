import {updateWoodPickup} from '../src/core/wood-pickup.js';
import {prepareBossNode} from './helpers/boss-node.mjs';
import {clearingSite} from '../src/progression/clearing-site.js';
import {waveDifficulty,clearingWaveBudget} from '../src/config/waves.js';
import { forestReward } from '../src/config/economy.js';
// 当前资源职责回归：采树只产木材，怪物与领主只产金币，清缴按正式波次配额分摊。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress } from '../src/game.js';

// 使用截图库存验证加载与重新出发不会重算已有资源。
function arena() {
  const progress = freshProgress();
  progress.coins = 57299; progress.wood = 857;
  const g = new Game(validateProgress(JSON.parse(JSON.stringify(progress))), () => 0.5);
  g.start(); g.trees = []; g.enemies = [];
  return g;
}

test('已有库存加载及重新开始不变，伐木落地拾取后向背包新增8木材、不直接入库或产金币', () => {
  const g = arena();
  assert.equal(g.progress.coins, 57299); assert.equal(g.progress.wood, 857);
  g.addTree(950, 760);
  const tree = g.trees[0];
  g.hit(tree, 10000);
  g.mainlineSpeech=null;g.vehicle.active=false;Object.assign(g.player,{x:tree.x,y:tree.y});updateWoodPickup(g,0);for(let i=0;i<10;i++)updateWoodPickup(g,.05);
  assert.equal(g.progress.coins, 57299); assert.equal(g.progress.wood, 857);assert.equal(g.progress.logistics.bagWood,8);
  g.hit(tree, 10000);
  assert.equal(g.progress.coins, 57299); assert.equal(g.progress.wood, 857);assert.equal(g.progress.logistics.bagWood,8);
  const saved = validateProgress(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(saved.coins, 57299); assert.equal(saved.wood, 857);assert.equal(saved.logistics.bagWood,8);
});

test('普通遭遇基础、高阶、精英及飞行怪按1.4倍发金币，不产木材且只结算一次', () => {
  for (const [reward, expectedCoins, flying] of [[15, 21, false], [33, 46, false], [51, 71, false], [15, 21, true]]) {
    const g = arena(), actual=forestReward('enemy',reward,g.progress);
    assert.deepEqual(actual,{coins:expectedCoins,wood:0});
    const enemy = g.spawnEnemy(0, 150, null, {ambient:true});
    Object.assign(enemy, { reward, flying });
    g.hit(enemy, 10000);
    assert.equal(g.progress.coins, 57299 + actual.coins);
    assert.equal(g.progress.wood, 857 + actual.wood);
    assert.deepEqual([g.drops[0].coins, g.drops[0].wood], [actual.coins, actual.wood]);
    g.hit(enemy, 10000);
    assert.equal(g.progress.wood, 857 + actual.wood); assert.equal(g.kills, 1);
  }
});

test('第15波14只清缴怪合计392金币，不产木材且不叠加怪物基础奖励', () => {
  const g = arena(); g.wave = 15; g.waveKills = g.waveSpawned = 0;
  g.progress.living.patrolActive=true;Object.assign(g.player,clearingSite(g.progress));
  const total=waveDifficulty(g.wave).total,budget=clearingWaveBudget(g.wave,g.progress);
  assert.equal(total,14);assert.equal(budget.coins,392);assert.equal(budget.wood,0);
  for (let i = 0; i < total; i++) {
    const e = g.spawnEnemy(0, 100);
    // 清缴按配额价格结算，即使基础掉落或怪物阶级不同也不能再加一份。
    e.reward=i%2?51:33;
    g.hit(e, 100000);g.hit(e,100000);
  }
  assert.equal(g.waveKills,total);assert.equal(g.progress.coins,57299+392);assert.equal(g.progress.wood,857);
  assert.equal(g.drops.reduce((n,d)=>n+d.coins,0),392);
  assert.equal(g.progress.economyLog.income['forest:enemy:coins'],392);
});

test('Boss奖励为180金币、不产木材，未击杀和远处回收不发资源', () => {
  const g = arena(), e = g.spawnEnemy(0, 150, null, {ambient:true});
  g.hit(e, 1);
  assert.equal(g.progress.wood, 857); assert.equal(g.progress.coins, 57299);
  // 受击中的单位暂不回收；结束反冲后再验证普通远处回收路径。
  Object.assign(e, { x: g.player.x + 1700, knockTime: 0, pushX: 0, pushY: 0 });
  g.updateWaves = () => {}; g.attackTimer = 999;
  g.update(0.01);
  assert.equal(g.enemies.length, 0); assert.equal(g.progress.wood, 857);
  g.wave=5;g.progress.living.patrolActive=true;Object.assign(g.player,clearingSite(g.progress));
  prepareBossNode(g);assert.equal(g.summonBoss(),true);
  const boss=g.boss;g.hit(boss,100000);g.hit(boss,100000);
  assert.equal(g.progress.coins, 57479); assert.equal(g.progress.wood, 857);
});
