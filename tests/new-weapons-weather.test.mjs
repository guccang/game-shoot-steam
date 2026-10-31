import { WORLD } from '../src/world/coordinates.js';
// 新武器验证真实计时、范围伤害和在途快照，雷阵雨验证时序与旧档兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, WEAPONS, validateProgress } from '../src/game.js';
import { fireBallistics } from '../src/combat/ballistics.js';
import { launchGrenade, explodeGrenade } from '../src/combat/grenades.js';
import {
  normalizeEnvironment,
  advanceEnvironment,
  EnvironmentTransition,
} from '../src/world/environment.js';
import { StormCycle } from '../src/world/storm.js';

// 清理随机场景与刷新，保留生产攻击、弹道与伤害流程。
function arena(weapon = 6) {
  const events = [];
  const game = new Game(
    freshProgress(),
    () => 0.5,
    (type) => events.push(type),
  );
  game.trees = [];
  game.enemies = [];
  game.progress.weapon = weapon;
  game.progress.weapons[weapon] = 1;
  game.start();
  game.spawnTimer = 999;
  game.attackTimer = 0;
  game.player.invincible = 999;
  return { game, events };
}

// 静态高生命目标用于隔离弹道，不依赖 AI 追击方向。
function target(id, x, y, type = 'enemy') {
  return { id, x, y, type, hp: 10000, maxHp: 10000, radius: type === 'tree' ? 22 : 17, mass: 1 };
}

test('普通攻击三秒后发射榴弹，继续点射并周期发射；空场不蓄能', () => {
  const { game: g, events } = arena();
  g.trees = [target(90, 1050, 700, 'tree')];
  g.update(0.05);
  for (let i = 0; i < 59; i++) g.update(0.05);
  assert.equal(events.filter((e) => e === 'grenade-launch').length, 0);
  assert.ok(g.trees[0].hp < 10000, '普通点射必须实际造成伤害');
  g.update(0.05);
  assert.equal(events.filter((e) => e === 'grenade-launch').length, 1);
  for (let i = 0; i < 60; i++) g.update(0.05);
  assert.equal(events.filter((e) => e === 'grenade-launch').length, 2);
  assert.ok(events.filter((e) => e === 'shot').length >= 17);
  g.trees = [];
  g.enemies = [];
  g.update(0.05);
  assert.equal(g.weaponCycle.charge, 0);
  assert.equal(g.weaponCycle.firing, false);
});

test('暂停冻结蓄能和榴弹，换枪清零蓄能但不改变在途伤害，死亡重开清理', () => {
  const { game: g } = arena();
  g.trees = [target(90, 1050, 700, 'tree')];
  for (let i = 0; i < 62; i++) g.update(0.05);
  const grenade = g.projectiles.find((b) => b.kind === 'grenade-bomb');
  assert.ok(grenade);
  const snapshot = structuredClone(grenade),
    charge = g.weaponCycle.charge;
  g.pause();
  g.update(0.05);
  assert.deepEqual(grenade, snapshot);
  assert.equal(g.weaponCycle.charge, charge);
  g.progress.weapons[7] = 1;
  g.transact('weapons', 7, 'equip');
  assert.equal(g.weaponCycle.charge, 0);
  assert.equal(grenade.amount, snapshot.amount);
  g.pause();
  g.player.invincible = 0;
  g.hurt(99999);
  g.start();
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.weaponCycle.charge, 0);
});

test('榴弹落点锁定、飞行后爆炸，伤害随距离衰减且击退朝向爆心外', () => {
  const { game: g } = arena();
  const middle = target(1, 1000, 700),
    left = target(2, 950, 700),
    right = target(3, 1070, 700),
    far = target(4, 1200, 700);
  g.enemies = [middle, left, right, far];
  launchGrenade(g, WEAPONS[6], { x: 900, y: 692 }, middle, 20);
  const grenade = g.projectiles[0];
  g.updateProjectiles(0.1);
  assert.equal(middle.hp, 10000);
  assert.ok(grenade.z > 9);
  middle.x = 1400;
  g.updateProjectiles(1);
  assert.equal(middle.hp, 10000, '已经移动出落点的怪物可以躲开');
  assert.ok(left.hp < right.hp && right.hp < 10000);
  assert.equal(far.hp, 10000);
  assert.ok(left.hitX < 0 && right.hitX > 0);
  const hp = left.hp;
  explodeGrenade(g, grenade);
  assert.equal(left.hp, hp);
  assert.equal(g.projectiles.length, 0);
});

test('爆炸覆盖树木领主与地图接缝，每个死亡目标仅发一次奖励', () => {
  const { game: g, events } = arena();
  g.enemies = [target(1, WORLD.width - 10, 700)];
  g.enemies[0].hp = 1;
  g.trees = [target(2, 30, 700, 'tree')];
  g.trees[0].hp = 1;
  g.boss = target(3, 50, 700, 'boss');
  g.boss.hp = 1;
  const grenade = { x: 5, y: 692, radius: 110, amount: 100, impulse: 78, dx: 1, dy: 0 };
  explodeGrenade(g, grenade);
  explodeGrenade(g, grenade);
  assert.equal(g.kills, 1);
  assert.equal(g.chopped, 1);
  assert.equal(g.progress.bosses, 1);
  assert.equal(events.filter((e) => e === 'reward').length, 3);
});

test('火流飞行扩散，穿过多个近处怪物但不命中远处或背后，每束只伤一次', () => {
  const { game: g } = arena(7);
  const mobs = [
    target(1, 970, 700),
    target(2, 1030, 720),
    target(3, 1250, 700),
    target(4, 850, 700),
  ];
  g.enemies = mobs;
  fireBallistics(g, WEAPONS[7], { x: 920, y: 692 }, { x: 1, y: 0 }, 8, false);
  assert.ok(mobs.every((m) => m.hp === 10000));
  g.updateProjectiles(1);
  assert.deepEqual(
    mobs.map((m) => m.hp),
    [9992, 9992, 10000, 10000],
  );
  assert.equal(g.projectiles.length, 0);
});

test('树干阻断火流，持续喷射有伤害并且弹体会回收', () => {
  const { game: g } = arena(7);
  g.trees = [target(1, 960, 700, 'tree')];
  g.enemies = [target(2, 1020, 700)];
  for (let i = 0; i < 10; i++) {
    fireBallistics(g, WEAPONS[7], { x: 920, y: 692 }, { x: 1, y: 0 }, 8, false);
    g.updateProjectiles(0.1);
  }
  g.updateProjectiles(1);
  assert.equal(g.trees[0].hp, 9920);
  assert.equal(g.enemies[0].hp, 10000);
  assert.equal(g.projectiles.length, 0);
});

test('六枪旧档补齐新槽位，新枪购买升级与刷新装备保持兼容', () => {
  const old = validateProgress({ ...freshProgress(), weapons: [3, 2, 1, 1, 1, 1], weapon: 5 });
  assert.deepEqual(old.weapons, [3, 2, 1, 1, 1, 1, ...Array(WEAPONS.length - 6).fill(0)]);
  assert.equal(old.weapon, 5);
  const g = new Game(old);
  g.progress.materials = { parts: 10000, crystal: 10000, core: 100 };
  g.progress.coins = g.progress.wood = 20000;
  g.progress.bosses = Math.max(WEAPONS[6].bosses,WEAPONS[7].bosses);
  for (const i of [6, 7]) {
    assert.ok(g.transact('weapons', i, 'buy'));
    assert.ok(g.transact('weapons', i, 'upgrade'));
    assert.equal(g.progress.weapons[i], 2);
  }
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.progress.weapon, 7);
  assert.equal(restored.damage(), g.damage());
});

test('雷阵雨可保存、自动选中和柔和过渡，减少动态不产生闪电', () => {
  const state = normalizeEnvironment({ weather: 'thunder', autoTime: false }, 0);
  assert.equal(normalizeEnvironment(JSON.parse(JSON.stringify(state)), 100).weather, 'thunder');
  const sunny = normalizeEnvironment({ forestSeason: 'summer' }, 0);
  advanceEnvironment(sunny, 120000, () => 0.9);
  assert.equal(sunny.weather, 'thunder');
  const light = new EnvironmentTransition({ weather: 'sun', time: 'day' }, 0);
  light.set(state, 0);
  assert.ok(light.sample(400).storm > 0 && light.sample(400).storm < 1);
  assert.equal(light.sample(20000).rain, 1);
  assert.equal(light.sample(20000).storm, 1);
  const storm = new StormCycle();
  storm.sample(0, true);
  assert.ok(storm.sample(2350, true).flash > 0.9);
  assert.equal(storm.sample(2400, true, true).flash, 0);
  assert.equal(storm.sample(3100, true).thunder, true);
  assert.equal(storm.sample(3200, true).thunder, false);
  assert.equal(storm.sample(14100, true).thunder, true);
  storm.sample(15000, false);
  assert.equal(storm.sample(16000, true).flash, 0);
});
