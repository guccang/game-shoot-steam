import {summonBossAtNode} from './helpers/boss-node.mjs';
// 材料经济回归：真实击杀、保底、完整配方事务、目标迁移及存档保留。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { BOSSES } from '../src/config/bosses.js';
import { MATERIAL_KEYS, MATERIAL_CAP } from '../src/config/materials.js';
import { awardMaterials } from '../src/progression/material-loot.js';
import { equipmentRecipe, canPurchaseEquipment, trackEquipment, equipmentRequirements } from '../src/progression/equipment-goals.js';
import { transactProgress } from '../src/progression/transactions.js';
import { transactVehicle } from '../src/progression/vehicles.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { unlockedWeaponProgress } from '../src/progression/unlock-weapons.js';
import { simulateEconomy, ECONOMY_ROUTE } from '../scripts/economy-sim.mjs';
import {MAINLINE_IDS} from '../src/config/mainline.js';

// 使用配方精确提供余额，验证失败原子性和购买后扣空。
function exact(kind, index) {
  const p = freshProgress(), cost = equipmentRecipe(kind, index);
  // 配方专项以已取得主线资格为前提，任务门槛另由主线专项验证。
  p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  p.coins = cost.coins; p.wood = cost.wood; p.bosses = cost.bosses;
  for (const key of MATERIAL_KEYS) p.materials[key] = cost[key];
  return p;
}
// 所有购买均经生产事务入口，不在测试中替代扣费逻辑。
function buy(p, kind, index) {
  return kind === 'weapons' ? transactProgress(p, kind, index, 'buy')
    : transactVehicle(p, kind, index, 'buy');
}

test('每把新枪、独立炮塔和高级车体严格检查所有材料与战绩，失败不扣费', () => {
  const targets = WEAPONS.flatMap((w, i) => [
    ...(i ? [['weapons', i]] : []), ...(!w.controller ? [['turret', i]] : []),
  ]).concat([['vehicle', 1], ['vehicle', 2]]);
  for (const [kind, index] of targets) {
    for (const row of equipmentRequirements(exact(kind, index), kind, index)) {
      const p = exact(kind, index);
      if (MATERIAL_KEYS.includes(row.key)) p.materials[row.key]--;
      else p[row.key]--;
      const before = structuredClone(p);
      assert.equal(canPurchaseEquipment(p, kind, index), false);
      assert.equal(buy(p, kind, index), false);
      assert.deepEqual(p, before);
    }
    const p = exact(kind, index), bosses = p.bosses;
    assert.ok(trackEquipment(p, kind, index));
    assert.ok(buy(p, kind, index));
    assert.equal(p.coins, 0); assert.equal(p.wood, 0);
    assert.deepEqual(p.materials, { parts: 0, crystal: 0, core: 0 });
    assert.equal(p.bosses, bosses); assert.equal(p.equipmentGoal, null);
    const after = structuredClone(p);
    assert.equal(buy(p, kind, index), false);
    assert.deepEqual(p, after);
  }
  assert.equal(transactVehicle(freshProgress(), 'weapons', 3, 'buy'), false);
});

test('零件8杀、普通区晶体24杀保底，保底可跨刷新且树木不推进', () => {
  let p = freshProgress();
  for (let i = 0; i < 7; i++) awardMaterials(p, { type: 'enemy', rank: 0, biome: 'meadow' }, () => 1);
  assert.equal(p.materials.parts, 0); assert.equal(p.materialPity.parts, 7);
  awardMaterials(p, { type: 'tree' }, () => 0);
  assert.equal(p.materialPity.parts, 7);
  p = validateProgress(JSON.parse(JSON.stringify(p)));
  awardMaterials(p, { type: 'enemy', rank: 0, biome: 'meadow' }, () => 1);
  assert.equal(p.materials.parts, 1);
  for (let i = 8; i < 24; i++) awardMaterials(p, { type: 'enemy', rank: 0, biome: 'meadow' }, () => 1);
  assert.deepEqual(p.materials, { parts: 3, crystal: 1, core: 0 });
  assert.deepEqual(p.materialPity, { parts: 0, crystal: 0 });
});

test('指定林区晶体8杀保底，精英稳定掉落，随机提前掉落会重置保底', () => {
  const p = freshProgress();
  for (let i = 0; i < 8; i++) awardMaterials(p, { type: 'enemy', rank: 0, biome: 'pine' }, () => 1);
  assert.deepEqual(p.materials, { parts: 1, crystal: 1, core: 0 });
  const elite = awardMaterials(p, { type: 'enemy', rank: 2, biome: 'deep' }, () => 1);
  assert.deepEqual(elite, { parts: 3, crystal: 2, core: 0 });
  awardMaterials(p, { type: 'enemy', rank: 0, biome: 'amber' }, () => 1);
  awardMaterials(p, { type: 'enemy', rank: 0, biome: 'amber' }, () => 0);
  assert.deepEqual(p.materialPity, { parts: 0, crystal: 0 });
});

test('真实击杀即时入账，重复击杀不发奖，死亡和刷新保留材料、首通和追踪', () => {
  const g = new Game(freshProgress(), () => 0.99); g.start();
  trackEquipment(g.progress, 'weapons', 12);
  const enemy = g.spawnEnemy(0, 300); enemy.rank = 2; enemy.biome = 'pine';
  g.hit(enemy, 1e9); g.hit(enemy, 1e9);
  assert.deepEqual(g.progress.materials, { parts: 3, crystal: 2, core: 0 });
  g.kills = 12; summonBossAtNode(g);
  const boss = g.boss; g.hit(boss, 1e9); g.hit(boss, 1e9);
  assert.deepEqual(g.progress.materials, { parts: 11, crystal: 8, core: 2 });
  g.hurt(1e9); g.start(); g.progress.patrol = capturePatrol(g);
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.deepEqual(restored.progress.materials, g.progress.materials);
  assert.deepEqual(restored.progress.materialBosses, [boss.kind]);
  assert.deepEqual(restored.progress.equipmentGoal, { kind: 'weapons', index: 12 });
  assert.equal(awardMaterials(restored.progress, boss, () => 1).core, 1);
  restored.resetProgress();
  assert.deepEqual(restored.progress.materials, { parts: 0, crystal: 0, core: 0 });
  assert.equal(restored.progress.equipmentGoal, null);
  assert.deepEqual(restored.progress.materialBosses, []);
});

test('旧档装备、熟练度、资源和波次不变，新材料为零；已拥有装备升级不需要材料', () => {
  const old = freshProgress();
  delete old.materials; delete old.materialPity; delete old.materialBosses; delete old.equipmentGoal;
  old.weapons[12] = 20; old.weapons[8] = 2; old.vehicleHulls[2] = 3; old.vehicleWeapons[8] = 4;
  old.mastery[8] = 120; old.mods[8] = 1; old.bosses = 3; old.coins = 5000; old.wood = 3000;
  const p = validateProgress(old);
  assert.deepEqual(p.weapons, old.weapons); assert.deepEqual(p.vehicleHulls, old.vehicleHulls);
  assert.deepEqual(p.materials, { parts: 0, crystal: 0, core: 0 });
  assert.deepEqual(p.materialBosses, BOSSES.slice(0, 3).map(b => b.id));
  assert.equal(p.coins, 5000); assert.equal(p.wood, 3000);
  assert.equal(p.mastery[8], 120); assert.equal(p.mods[8], 1);
  assert.ok(transactProgress(p, 'weapons', 8, 'upgrade'));
  assert.ok(transactVehicle(p, 'vehicle', 2, 'upgrade'));
  assert.ok(transactVehicle(p, 'turret', 8, 'upgrade'));
  assert.deepEqual(p.materials, { parts: 0, crystal: 0, core: 0 });
});

test('追踪支持三种装备、取消与切换，体验解锁不会额外赠送材料或留下已拥有目标', () => {
  let p = freshProgress();
  assert.equal(trackEquipment(p, 'weapons', 0), false);
  for (const [kind, index] of [['weapons', 9], ['turret', 14], ['vehicle', 2]]) {
    assert.ok(trackEquipment(p, kind, index));
    assert.deepEqual(validateProgress(p).equipmentGoal, { kind, index });
    assert.ok(trackEquipment(p, kind, index)); assert.equal(p.equipmentGoal, null);
  }
  assert.equal(trackEquipment(p, 'turret', 12), true);
  assert.equal(trackEquipment(p, 'other', 3), false);
  trackEquipment(p, 'weapons', 9);
  p = unlockedWeaponProgress(p);
  assert.equal(p.equipmentGoal, null); assert.deepEqual(p.materials, { parts: 0, crystal: 0, core: 0 });
});

test('损坏材料、保底和追踪安全回退，库存封顶避免无限值污染', () => {
  const p = validateProgress({ ...freshProgress(),
    materials: { parts: -1, crystal: Infinity, core: 1e20 },
    materialPity: { parts: 99, crystal: NaN }, materialBosses: ['bad', 'boar', 'boar'],
    equipmentGoal: { kind: 'weapons', index: '<script>' } });
  assert.deepEqual(p.materials, { parts: 0, crystal: 0, core: MATERIAL_CAP });
  assert.deepEqual(p.materialPity, { parts: 7, crystal: 0 });
  assert.deepEqual(p.materialBosses, ['boar']); assert.equal(p.equipmentGoal, null);
  awardMaterials(p, { type: 'boss', kind: 'boar' });
  assert.equal(p.materials.core, MATERIAL_CAP);
});

test('100组固定种子的经济假设覆盖三小时路线，早期工具及时取得且终局不提前解锁', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const result = simulateEconomy(seed);
    assert.equal(result.completed, true);
    assert.equal(result.purchases.length, ECONOMY_ROUTE.length);
    assert.ok(result.purchases[0].minute <= 8);
    assert.ok(result.purchases.at(-1).minute >= 120 && result.purchases.at(-1).minute <= 180);
    assert.ok(Object.values(result.remaining).every(n => n >= 0));
  }
});
