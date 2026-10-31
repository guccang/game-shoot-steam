// 验证旧档迁移、熟练度奖励归属、改装事务和实际弹道快照。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { effectiveWeapon, masteryInfo } from '../src/config/weapon-mods.js';
import { awardMastery, changeWeaponMod } from '../src/progression/mastery.js';
import { fireBallistics } from '../src/combat/ballistics.js';

test('旧档保留装备，缺省新字段；非法熟练度和改装不能解锁收益', () => {
  const old = { ...freshProgress(), weapon: 8, weapons: [1, 0, 0, 0, 0, 0, 0, 0, 3, 0] };
  delete old.mastery;
  delete old.mods;
  const p = validateProgress(old);
  assert.equal(p.weapon, 8);
  assert.equal(p.weapons[8], 3);
  assert.equal(p.weapons.length, WEAPONS.length);
  assert.ok(p.mastery.every((x) => x === 0));
  p.mastery = [Infinity, 550, -20, 40];
  p.mods = [2, 2, 2, 2];
  const clean = validateProgress(p);
  assert.ok(clean.mods.every((x) => x === 0));
  assert.ok(clean.mastery.every((x) => x === 0));
});

test('改装先校验再扣费、互斥且可恢复原厂；满级熟练度封顶', () => {
  const p = freshProgress();
  p.coins = 1000;
  p.wood = 1000;
  assert.equal(changeWeaponMod(p, 0, 1), false);
  assert.equal(p.coins, 1000);
  for (let i = 0; i < 10; i++) awardMastery(p, 0, 'enemy');
  assert.equal(masteryInfo(p, 0).level, 2);
  assert.equal(changeWeaponMod(p, 0, 1), true);
  assert.equal(p.coins, 820);
  assert.equal(changeWeaponMod(p, 0, 1), false);
  assert.equal(p.coins, 820);
  assert.equal(changeWeaponMod(p, 0, 2), true);
  assert.equal(effectiveWeapon(p).interval, WEAPONS[0].interval * 1.35);
  assert.equal(changeWeaponMod(p, 0, 0), true);
  assert.equal(p.coins, 640);
  assert.equal(effectiveWeapon(p).interval, WEAPONS[0].interval);
  p.coins = 0;
  const before = structuredClone(p);
  assert.equal(changeWeaponMod(p, 0, 2), false);
  assert.deepEqual(p, before);
  for (let i = 0; i < 100; i++) awardMastery(p, 0, 'boss');
  assert.deepEqual(masteryInfo(p, 0), { xp: 550, level: 5, next: null, floor: 550 });
  awardMastery(p, 11, 'boss');
  assert.equal(p.mastery[11], 0);
});

test('所有枪械的分支参数有效且不污染原厂配置或另一分支', () => {
  const base = JSON.stringify(WEAPONS),
    p = freshProgress();
  p.weapons.fill(1);
  p.mastery.fill(40);
  p.coins = p.wood = 100000;
  for (let i = 0; i < WEAPONS.length; i++) {
    for (const choice of [1, 2, 0]) {
      assert.ok(changeWeaponMod(p, i, choice));
      const w = effectiveWeapon(p, i);
      for (const key of ['damage', 'interval', 'range', 'magazineSize', 'reloadTime'])
        assert.ok(Number.isFinite(w[key]) && w[key] > 0, `${i}:${choice}:${key}`);
    }
  }
  assert.equal(JSON.stringify(WEAPONS), base);
});

test('在途弹击杀归属发射枪，换枪不盗取熟练度，同一死亡不重复奖励', () => {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  const t = { id: 999, type: 'enemy', x: 1040, y: 700, hp: 1, maxHp: 1, radius: 17 };
  g.enemies = [t];
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, 100, false);
  g.progress.weapons[11] = 1;
  g.transact('weapons', 11, 'equip');
  g.updateProjectiles(0.5);
  assert.equal(g.progress.mastery[0], 4);
  assert.equal(g.progress.mastery[11], 0);
  g.hit(t, 100, false, { weaponIndex: 0 });
  assert.equal(g.progress.mastery[0], 4);
});

test('改装不补弹，已发射子弹参数不变，永久成长可保存并重开', () => {
  const g = new Game();
  g.trees = [];
  g.enemies = [];
  g.progress.mastery[0] = 40;
  g.progress.coins = g.progress.wood = 1000;
  g.magazines[0].ammo = 2;
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, g.damage(), false);
  const shot = structuredClone(g.projectiles[0]);
  assert.ok(g.modifyWeapon(0, 2));
  assert.equal(g.magazines[0].ammo, 2);
  assert.deepEqual(g.projectiles[0], shot);
  assert.ok(g.damage() > shot.amount);
  const saved = new Game(JSON.parse(JSON.stringify(g.progress)));
  saved.reset();
  assert.equal(saved.progress.mods[0], 2);
  assert.equal(saved.progress.mastery[0], 40);
  saved.resetProgress();
  assert.ok(saved.progress.mods.every((x) => x === 0));
  assert.ok(saved.progress.mastery.every((x) => x === 0));
});
