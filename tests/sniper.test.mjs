import { equipmentRecipe } from '../src/progression/equipment-goals.js';
import { WORLD } from '../src/world/coordinates.js';
// 狙击枪验证实际远射、贯穿去重、存档兼容、重击物理与暂停清理。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { fireBallistics, updateBallistics } from '../src/combat/ballistics.js';
import { createEnemyAttack } from '../src/combat/enemy-attack.js';
import { CombatFX, FX_LIMIT } from '../src/combat/effects.js';
const index = WEAPONS.findIndex((w) => w.id === 'sniper');
const weapon = WEAPONS[index];

// 隔离场景与自动射击，保留真实瞄准、弹道、伤害和物理更新。
function arena() {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  g.progress.weapon = index;
  g.progress.weapons[index] = 1;
  Object.assign(g.player, { x: 200, y: 600 });
  g.start();
  g.attackTimer = g.spawnTimer = 999;
  return g;
}

// 同一水平线上的目标可作为树、基础怪或高质量领主参与生产命中流程。
function target(id, x, type = 'enemy', mass = 1) {
  return {
    id,
    x,
    y: 600,
    type,
    radius: 17,
    mass,
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    phase: 0,
    biome: 'meadow',
    assault: createEnemyAttack(),
  };
}

test('狙击枪扩容旧档并保持购买门槛，升级和刷新后仍可装备', () => {
  const old = validateProgress({
    ...freshProgress(),
    weapons: [3, 2, 1, 1, 1, 1, 2, 2],
    weapon: 7,
  });
  assert.deepEqual(old.weapons, [3, 2, 1, 1, 1, 1, 2, 2, ...Array(WEAPONS.length - 8).fill(0)]);
  const g = new Game(old);
  const price=equipmentRecipe('weapons',index);
  g.progress.materials={parts:price.parts,crystal:price.crystal,core:price.core};
  g.progress.coins = 20000;
  g.progress.wood = 6000;
  g.progress.bosses = 5;
  const before = structuredClone(g.progress);
  assert.equal(g.transact('weapons', index, 'buy'), false);
  assert.deepEqual(g.progress, before);
  g.progress.bosses = 6;
  assert.ok(g.transact('weapons', index, 'buy'));
  assert.equal(g.progress.coins, 20000 - weapon.coins);
  assert.ok(g.transact('weapons', index, 'upgrade'));
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.progress.weapon, index);
  assert.equal(restored.damage(), 112);
});

test('远处怪物优先于近树，子弹真实飞行到远处才结算伤害且射程外不瞄准', () => {
  const g = arena(),
    enemy = target(1, 850);
  g.enemies = [enemy];
  g.trees = [target(2, 260, 'tree')];
  g.trees[0].y = 680;
  assert.equal(g.findAttackTarget(), enemy);
  assert.ok(g.attack());
  assert.equal(enemy.hp, 1000);
  updateBallistics(g, 0.15);
  assert.equal(enemy.hp, 1000);
  updateBallistics(g, 0.22);
  assert.equal(enemy.hp, 908);
  updateBallistics(g, 1);
  assert.equal(g.projectiles.length, 0);
  enemy.x = 1000;
  g.trees = [];
  assert.equal(g.findAttackTarget(), null);
});

test('一颗狙击弹贯穿六个树怪，逐次衰减、同一目标只伤一次并停止在第六个', () => {
  const g = arena();
  const targets = Array.from({ length: 7 }, (_, i) =>
    target(i + 1, 300 + i * 65, i % 2 ? 'enemy' : 'tree'),
  );
  g.trees = targets.filter((t) => t.type === 'tree');
  g.enemies = targets.filter((t) => t.type === 'enemy');
  fireBallistics(g, weapon, { x: 230, y: 592 }, { x: 1, y: 0 }, 92, false);
  updateBallistics(g, 0.5);
  assert.deepEqual(
    targets.map((t) => 1000 - t.hp),
    [92, 79, 68, 58, 50, 46, 0],
  );
  assert.equal(g.projectiles.length, 0);
  updateBallistics(g, 1);
  assert.equal(targets[0].hp, 908);
});

test('贴身重叠贯穿与循环边界不漏伤，30帧和120帧结果相同', () => {
  const close = arena();
  close.enemies = Array.from({ length: 7 }, (_, i) => ({
    ...target(i + 1, 208 + i * 5),
    radius: 3,
  }));
  fireBallistics(close, weapon, { x: 245, y: 592 }, { x: 1, y: 0 }, 92, false);
  assert.deepEqual(
    close.enemies.map((t) => 1000 - t.hp),
    [92, 79, 68, 58, 50, 46, 0],
  );
  assert.equal(close.projectiles.length, 0);
  const results = [];
  for (const dt of [1 / 30, 1 / 120]) {
    const g = arena();
    g.player.x = WORLD.width - 60;
    g.enemies = [target(1, WORLD.width - 10), target(2, 40), target(3, 130)];
    fireBallistics(g, weapon, { x: WORLD.width - 40, y: 592 }, { x: 1, y: 0 }, 92, false);
    for (let t = 0; t < 0.6; t += dt) updateBallistics(g, dt);
    results.push(g.enemies.map((e) => e.hp));
  }
  assert.deepEqual(results[0], [908, 921, 932]);
  assert.deepEqual(results[0], results[1]);
});

test('换枪升级不改变在途穿甲弹，暂停冻结弹丸、后坐、碎块和镜头冲量', () => {
  const g = arena();
  g.enemies = [target(1, 850)];
  g.attack();
  g.pause();
  const before = structuredClone({
    b: g.projectiles,
    fx: g.fx.items,
    shake: g.fx.shake,
    recoil: g.player.recoil,
  });
  g.update(0.05);
  assert.deepEqual(
    { b: g.projectiles, fx: g.fx.items, shake: g.fx.shake, recoil: g.player.recoil },
    before,
  );
  g.progress.weapons[index] = 20;
  g.transact('weapons', 0, 'equip');
  g.pause();
  updateBallistics(g, 0.5);
  assert.equal(g.enemies[0].hp, 908);
  g.reset();
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.remnants.length, 0);
  assert.equal(g.fx.shake.life, 0);
});

test('致命狙击击飞翻滚残骸并撞动后方怪物，奖励只发一次且残骸最终清理', () => {
  const g = arena(),
    victim = target(1, 500),
    next = target(2, 555);
  victim.hp = 40;
  g.enemies = [victim, next];
  const impact = { direction: { x: 1, y: 0 }, impulse: 110, power: 1.8 };
  g.hit(victim, 92, false, impact);
  const coins = g.progress.coins;
  g.hit(victim, 92, false, impact);
  assert.equal(g.progress.coins, coins);
  assert.equal(g.kills, 1);
  const corpse = g.remnants[0];
  assert.ok(corpse.pushX > 400 && corpse.vz >= 170);
  let pushed = false,
    lifted = false,
    rolled = false;
  for (let i = 0; i < 24; i++) {
    g.update(0.05);
    pushed ||= next.pushX > 20;
    lifted ||= corpse.z > 15;
    rolled ||= Math.abs(corpse.rollAngle) > 0.5;
  }
  assert.ok(pushed && lifted && rolled);
  assert.equal(g.remnants.length, 0);
  const heavy = target(9, 500, 'boss', 6);
  g.hit(heavy, 92, false, impact);
  assert.ok(heavy.pushX > 0 && heavy.pushX <= 55, '领主承受受限的狙击枪击退');
  assert.equal(heavy.knockTime || 0, 0, '领主不会进入翻滚硬直');
});

test('狙击碎片沿弹道高能喷散，光效与粒子有界并随时间回收', () => {
  const ordinary = new CombatFX(() => 0.5),
    heavy = new CombatFX(() => 0.5);
  const hit = { target: target(1, 500, 'tree'), x: 500, y: 592 };
  ordinary.impact(hit, { x: 1, y: 0 }, false, false, true);
  heavy.impact(hit, { x: 1, y: 0 }, false, false, true, false, 1.8);
  const chips = heavy.items.filter((p) => p.kind === 'chip');
  assert.ok(chips.length > ordinary.items.filter((p) => p.kind === 'chip').length);
  assert.ok(chips.every((p) => p.vx > 300 && p.vz > 170));
  assert.ok(
    heavy.items.some((p) => p.kind === 'pressure') &&
      heavy.items.some((p) => p.kind === 'impact-flash'),
  );
  for (let i = 0; i < 30; i++) heavy.impact(hit, { x: 1, y: 0 }, false, false, true, false, 1.8);
  assert.ok(heavy.items.length <= FX_LIMIT);
  assert.ok(heavy.shake.strength <= 5);
  for (let i = 0; i < 240; i++) heavy.update(1 / 60);
  assert.equal(heavy.items.length, 0);
  assert.equal(heavy.shake.life, 0);
});
