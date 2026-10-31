import { turnWeapon } from '../src/combat/weapon-turn.js';
// 电锯完整规则：前期购买、近战碰撞、采集加成、能源、成长归属与独立挂载。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { advanceReload } from '../src/combat/magazine.js';
import { emitWeaponAttack } from '../src/combat/weapon-fire.js';
import { WORLD } from '../src/world/coordinates.js';
import { updateFunnel } from '../src/combat/funnel.js';

const SAW = 14;
// 静态靶场保留真实攻击与奖励入口，不推进随机刷怪。
function arena() {
  const p = freshProgress();
  p.weapon = SAW; p.weapons[SAW] = 1;
  const g = new Game(p, () => 0.5);
  g.start(); g.enemies = []; g.trees = []; g.boss = null;
  g.player.x = 1600; g.player.y = 700;
  return g;
}
// 构建静态接触体，树木死亡信息与真实树桩一致。
function target(g, id, dx, type = 'tree', hp = 55) {
  return { id, type, x: g.player.x + dx, y: g.player.y, hp, maxHp: hp, radius: 18,
    size: 1, variant: 0, palette: 'meadow', flash: 0 };
}

test('电锯无需 Boss、低价购买并排在手枪后，旧档补齐而不授予所有权', () => {
  const p = freshProgress(); p.coins = 120; p.wood = 40; p.materials.parts = 2;
  const g = new Game(p);
  assert.equal(g.transact('weapons', SAW, 'buy'), true);
  assert.equal(g.progress.weapons[SAW], 1);
  assert.equal(g.progress.coins, 0); assert.equal(g.progress.wood, 0);
  const old = freshProgress(); old.weapons = old.weapons.slice(0, 14);
  old.mastery = old.mastery.slice(0, 14); old.mods = old.mods.slice(0, 14);
  const restored = validateProgress(old);
  for (const k of ['weapons', 'mastery', 'mods']) assert.equal(restored[k][SAW], 0);
});

test('普通树两次切割倒下，奖励和熟练度只结算一次且没有子弹弹壳', () => {
  const g = arena(), tree = target(g, 100, 60);
  g.trees = [tree];
  assert.equal(g.attack(), true); assert.equal(tree.hp, 19);
  assert.equal(g.attack(), true); assert.ok(tree.hp <= 0);
  assert.equal(g.chopped, 1); assert.ok(g.progress.mastery[SAW] > 0);
  const xp = g.progress.mastery[SAW], drops = g.drops.length;
  assert.equal(g.attack(), false);
  assert.equal(g.progress.mastery[SAW], xp); assert.equal(g.drops.length, drops);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.fx.items.some(p => p.kind === 'shell'), false);
  assert.ok(g.fx.items.some(p => p.kind === 'chip' && p.material === 'wood'));
  assert.equal(g.magazines[SAW].ammo, 58);
});

test('远树不消耗电量，贴身不反向切割，怪物没有伐木倍率，树干可遮挡', () => {
  const g = arena(), far = target(g, 1, 140);
  g.trees = [far]; assert.equal(g.attack(), false);
  assert.equal(g.magazines[SAW].ammo, 60);
  far.x = g.player.x + 20; g.attack(); assert.equal(far.hp, 19);
  const enemy = target(g, 2, 70, 'enemy', 100);
  g.trees = []; g.enemies = [enemy]; g.attack(); assert.equal(enemy.hp, 91);
  far.hp = 100; g.trees = [far]; g.attack();
  assert.equal(enemy.hp, 91); assert.equal(far.hp, 64);
});

test('八个朝向和锯尖边缘都能切到近树，不受持枪偏移影响', () => {
  const g = arena();
  for (const distance of [20, 70, 84]) for (let i = 0; i < 8; i++) {
    const t = target(g, i + 100, 0), angle = i * Math.PI / 4;
    t.x += Math.cos(angle) * distance; t.y += Math.sin(angle) * distance;
    g.trees = [t]; turnWeapon(g.player,angle,1); assert.equal(g.attack(), true); assert.equal(t.hp, 19);
  }
});

test('能量耗尽自动充能，暂停及切枪保留状态，改装不补充电量', () => {
  const g = arena();
  g.trees = [target(g, 1, 60, 'tree', 1e6)];
  for (let i = 0; i < 60; i++) assert.equal(g.attack(), true);
  const mag = g.magazines[SAW];
  assert.equal(mag.ammo, 0); assert.equal(mag.remaining, 2);
  assert.equal(g.attack(), false);
  g.pause(); g.update(0.05); assert.equal(mag.remaining, 2); g.pause();
  g.transact('weapons', 0, 'equip'); g.update(0.05); assert.equal(mag.remaining, 2);
  g.transact('weapons', SAW, 'equip');
  g.progress.mastery[SAW] = 40; g.progress.mods[SAW] = 1;
  assert.equal(effectiveWeapon(g.progress).treeMultiplier, 6);
  assert.equal(mag.ammo, 0);
  advanceReload(mag, g.weapon(), 2);
  assert.equal(mag.ammo, 60);
});

test('地图接缝与独立炮口按本地锯链接触，不伤到角色和炮口之间的远处实体', () => {
  const g = arena();
  g.player.x = WORLD.width - 20;
  const t = target(g, 1, 50); t.x %= WORLD.width; g.trees = [t];
  g.attack(); assert.equal(t.hp, 19);
  g.player.x = 1600;
  const between = target(g, 2, 150), near = target(g, 3, 350);
  g.trees = [between, near];
  emitWeaponAttack(g, g.weapon(), { x: 1900, y: 692 }, { x: 1, y: 0 }, 9, false, true);
  assert.equal(between.hp, 55); assert.equal(near.hp, 19);
});

test('电锯挂载浮游炮能进入近战射位，而不是停在远程安全圈外', () => {
  const g = arena();
  g.progress.weapons[12] = 1; g.progress.funnelLoadout = [SAW, SAW, SAW];
  g.progress.weapon = 12;
  g.reset(); g.start(); g.enemies = []; g.boss = null; g.trees = [];
  g.trees = [target(g, 1, 70, 'tree', 1e6)];
  const t = g.trees[0];
  for (let i = 0; i < 360; i++) updateFunnel(g, 1 / 120);
  assert.ok(t.hp < 1e6 - 72);
  assert.ok(g.funnel.nodes.some(n => Math.hypot(g.player.x + n.x - t.x, g.player.y + n.y - t.y + 8) < WEAPONS[SAW].range));
});
