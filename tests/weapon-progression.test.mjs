import {summonBossAtNode} from './helpers/boss-node.mjs';
import { equipmentRecipe } from '../src/progression/workshop/equipment-goals.js';
// 武器获取门槛回归：资源与永久战绩同时达标，失败事务不扣费。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';

test('资源充足但战绩不足时，所有新枪均禁止购买且不修改进度', () => {
  const g = new Game(freshProgress());
  g.progress.coins = g.progress.wood = 10000;
  for (let index = 1; index < WEAPONS.length; index++) {
    g.progress.bosses = WEAPONS[index].bosses - 1;
    const before = structuredClone(g.progress);
    assert.equal(g.transact('weapons', index, 'buy'), false);
    assert.deepEqual(g.progress, before);
  }
});

test('战绩达标仍需两种资源足额，刚好达标时精确扣费且不消耗战绩', () => {
  for (let index = 1; index < WEAPONS.length; index++) {
    const g = new Game(freshProgress()), weapon = WEAPONS[index];
    g.progress.materials = { parts: 10000, crystal: 10000, core: 100 };
    g.progress.bosses = weapon.bosses;
    for (const missing of ['coins', 'wood']) {
      g.progress.coins = weapon.coins; g.progress.wood = weapon.wood; g.progress[missing]--;
      const before = structuredClone(g.progress);
      assert.equal(g.transact('weapons', index, 'buy'), false); assert.deepEqual(g.progress, before);
    }
    g.progress.coins = weapon.coins; g.progress.wood = weapon.wood;
    assert.ok(g.transact('weapons', index, 'buy'));
    assert.equal(g.progress.coins, 0); assert.equal(g.progress.wood, 0);
    assert.equal(g.progress.weapon, index); assert.equal(g.progress.bosses, weapon.bosses);
    assert.equal(g.transact('weapons', index, 'buy'), false);
  }
});

test('实际击败领主达成资格，重复结算无效，重生和存档恢复保留战绩', () => {
  const g = new Game(freshProgress()); g.start(); g.kills = 12;
  assert.ok(summonBossAtNode(g)); const boss = g.boss; g.hit(boss, 99999); g.hit(boss, 99999);
  assert.equal(g.progress.bosses, 1); g.reset();
  const restored = new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))));
  restored.progress.coins = equipmentRecipe('weapons',3).coins; restored.progress.wood = equipmentRecipe('weapons',3).wood;
  restored.progress.materials.parts=equipmentRecipe('weapons',3).parts;
  assert.ok(restored.transact('weapons', 3, 'buy'));
  assert.equal(restored.progress.bosses, 1);
});

test('旧存档已有枪不重新锁定，装备升级仍可用，未拥有枪按新条件购买', () => {
  const raw = freshProgress(); raw.weapons[2] = 3; raw.coins = raw.wood = 10000;
  const g = new Game(raw);
  assert.ok(g.transact('weapons', 2, 'equip')); assert.ok(g.transact('weapons', 2, 'upgrade'));
  assert.equal(g.progress.weapons[2], 4); assert.equal(g.progress.bosses, 0);
  assert.equal(g.transact('weapons', 1, 'buy'), false);
});
