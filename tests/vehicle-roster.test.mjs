import { ownedPineProgress as freshProgress } from './helpers/owned-pine-progress.mjs';
// 载具验收：购买成长、独立供给、飞行落地和旧存档迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, validateProgress } from '../src/game.js';
import { COLLECTED_VEHICLES } from '../src/config/vehicles.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { landingPoint } from '../src/combat/vehicle-landing.js';

import { moveBody, blocked } from '../src/physics/motion.js';
import { riverXAt } from '../src/world/river-geometry.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';

// 空战场只推进待测载具与地形，避免随机怪物影响耐久和计时断言。
function arena() {
  const p = freshProgress();
  p.materials = { parts: 10000, crystal: 10000, core: 100 };
  Object.assign(p, { coins: 100000, wood: 100000, bosses: 30 });
  const g = new Game(p, () => 0.5);
  g.start();
  g.enemies = [];
  g.trees = [];
  g.spawnTimer = g.attackTimer = 999;
  return g;
}

test('新载具按领主战绩和资源购买，重复购买不扣费且自带专属炮', () => {
  const g = arena();
  g.progress.bosses = COLLECTED_VEHICLES[1].bosses-1;
  const snapshot = JSON.stringify(g.progress);
  assert.equal(g.buyVehicle(1), false);
  assert.equal(JSON.stringify(g.progress), snapshot);
  g.progress.bosses = COLLECTED_VEHICLES[1].bosses;
  assert.equal(g.buyVehicle(1), true);
  assert.equal(g.progress.coins, 100000-COLLECTED_VEHICLES[1].coins);
  assert.equal(g.progress.wood, 100000-COLLECTED_VEHICLES[1].wood);
  assert.equal(g.vehicles[1].maxHp, 480);
  assert.equal(g.vehicles[1].weaponIndex,18);
  assert.equal(g.vehicle.index, 0);
  assert.equal(g.buyVehicle(1), false);
  assert.equal(g.buyVehicle(2), false);
  g.progress.bosses = COLLECTED_VEHICLES[2].bosses;
  assert.equal(g.buyVehicle(2), true);
  assert.equal(g.vehicles[2].maxHp, 180);
  assert.equal(g.progress.coins, 100000-COLLECTED_VEHICLES[1].coins-COLLECTED_VEHICLES[2].coins);
  assert.equal(g.progress.wood, 100000-COLLECTED_VEHICLES[1].wood-COLLECTED_VEHICLES[2].wood);
  assert.deepEqual(g.progress.vehicleHulls, [1, 1, 1, 0, 0, 0]);
  assert.ok(g.progress.vehicleWeapons.slice(0,17).every((n) => n === 0));assert.deepEqual(g.progress.vehicleWeapons.slice(17),[1,1,1,0]);
  assert.equal(g.buyVehicle(99), false);
  assert.equal(g.selectVehicle(-1), false);
  const poor = arena();
  poor.progress.wood = 0;
  assert.equal(poor.buyVehicle(1), false);
  assert.equal(poor.progress.coins, 100000);
});

test('各型号升级按自己的装甲成长与费用，不治愈、不补弹、不跳过修复', () => {
  for (const index of [1, 2, 3]) {
    const g = arena();
    g.buyVehicle(index);
    g.selectVehicle(index);
    g.summonVehicle();
    const model = COLLECTED_VEHICLES[index],
      hp = g.vehicle.maxHp,
      coins = g.progress.coins;
    g.vehicle.hp = hp / 2;
    assert.equal(g.upgradeVehicle(), true);
    assert.equal(g.vehicle.maxHp, hp + model.hpGrowth);
    assert.equal(g.vehicle.hp, (hp + model.hpGrowth) / 2);
    assert.equal(g.progress.coins, coins - 160);
    g.hurt(9999);
    assert.equal(g.vehicle.cooldown, 30);
    assert.equal(g.upgradeVehicle(), true);
    assert.equal(g.vehicle.hp, 0);
    assert.equal(g.vehicle.cooldown, 30);
    assert.equal(g.progress.vehicleHulls[0], 1);
    g.progress.vehicleHulls[g.progress.vehicleIndex||0] = 20;
    assert.equal(g.upgradeVehicle(), false);
  }
});

test('换车保留各自耐久和同型号炮塔弹夹，未出战炮塔暂停装填', () => {
  const g = arena();
  g.buyVehicle(1);
  g.buyVehicle(2);
  g.transactTurret(0, 'buy');
  const modules = [];
  for (const index of [0, 1, 2]) {
    if (index) g.selectVehicle(index);
    g.configureVehicle(0);
    g.summonVehicle();
    g.vehicle.hp -= 15;
    Object.assign(g.vehicle.module.magazine, { ammo: index + 1, remaining: 1.2 });
    g.vehicle.module.cooldown = 0.4;
    modules.push(g.vehicle.module);
  }
  assert.notEqual(modules[0], modules[1]);
  assert.notEqual(modules[1], modules[2]);
  updateVehicle(g, 0.2);
  assert.equal(modules[0].magazine.remaining, 1.2);
  assert.equal(modules[1].magazine.remaining, 1.2);
  assert.equal(modules[2].magazine.remaining, 1);
  g.selectVehicle(0);
  assert.equal(g.vehicle.active, false);
  assert.equal(g.player.flying, false);
  assert.equal(g.vehicle.hp, 225);
  assert.equal(g.vehicle.module, modules[0]);
  assert.equal(g.vehicle.module.magazine.ammo, 1);
  assert.equal(g.vehicle.module.cooldown, 0.4);
  assert.equal(g.magazines[0].ammo, 12);
});

test('修复计时独立，换车后继续修复，暂停死亡冻结，完成后手动驾驶', () => {
  const g = arena();
  g.buyVehicle(1);
  g.selectVehicle(1);
  g.summonVehicle();
  g.hurt(9999);
  g.selectVehicle(0);
  updateVehicle(g, 10);
  assert.equal(g.vehicles[1].cooldown, 20);
  for (const state of ['paused', 'dead']) {
    g.state = state;
    updateVehicle(g, 10);
    assert.equal(g.vehicles[1].cooldown, 20);
  }
  g.state = 'playing';
  g.selectVehicle(1);
  assert.equal(g.summonVehicle(), false);
  updateVehicle(g, 20);
  assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.hp, 0);
  assert.equal(g.summonVehicle(), true);
  assert.equal(g.vehicle.hp, 480);
});

test('直升机越河越树，地面载具仍被阻挡，安全下机后恢复地形碰撞', () => {
  const g = arena();
  g.buyVehicle(2);
  const y = 900,
    x = riverXAt(y);
  Object.assign(g.player, { x: x - 130, y });
  g.summonVehicle();
  moveBody(g.player, 260, 0, WORLD);
  assert.ok(g.player.x < x);
  g.selectVehicle(2);
  g.summonVehicle();
  moveBody(g.player, 260, 0, WORLD);
  assert.ok(g.player.x > x + 80);
  const start = g.player.x;
  const tree = { x: start + 45, y, hp: 50, radius: 22 };
  g.trees = [tree];
  moveBody(g.player, 45, 0, WORLD, 12, g.trees);
  assert.equal(g.player.x, tree.x);
  assert.equal(g.dismountVehicle(), true);
  assert.equal(g.player.flying, false);
  assert.equal(blocked(g.player.x, g.player.y, 12, g.trees), false);
  const before = { ...g.player };
  moveBody(g.player, tree.x - before.x, tree.y - before.y, WORLD, 12, g.trees);
  assert.ok(worldDistance(g.player, tree) >= 34);
});

test('空中被击毁会安全落地，保留驾驶员血量并清除冲量；循环边界可降落', () => {
  const g = arena();
  g.buyVehicle(2);
  g.selectVehicle(2);
  g.summonVehicle();
  const y = 900;
  Object.assign(g.player, {
    x: riverXAt(y) + WORLD.width,
    y: y - WORLD.height,
    recoilX: 120,
    recoilY: -80,
    hp: 71,
  });
  assert.equal(blocked(g.player.x, g.player.y), true);
  const airborne = { ...g.player };
  g.hurt(9999);
  assert.equal(g.player.flying, false);
  assert.equal(g.vehicle.active, false);
  assert.equal(g.player.hp, 71);
  assert.equal(g.vehicle.cooldown, 30);
  assert.equal(g.player.recoilX, 0);
  assert.equal(g.player.recoilY, 0);
  assert.equal(blocked(g.player.x, g.player.y, 12, g.trees), false);
  assert.ok(worldDistance(g.player, airborne) < 160);
  const safe = landingPoint(g.player, []);
  assert.deepEqual(safe, { x: g.player.x, y: g.player.y });
});

test('正式游戏更新保留三种速度差异与低空承伤', () => {
  const distances = [];
  for (const index of [0, 1, 2]) {
    const g = arena();
    if (index) {
      g.buyVehicle(index);
      g.selectVehicle(index);
    }
    g.summonVehicle();
    const x = g.player.x;
    for (let i = 0; i < 60; i++) g.update(1 / 60, { x: 1, y: 0 });
    distances.push(g.player.x - x);
    const hp = g.vehicle.hp;
    g.hurt(25);
    assert.equal(g.vehicle.hp, hp - 25);
  }
  assert.ok(Math.abs(distances[1] / distances[0] - 0.78) < 0.001);
  assert.ok(Math.abs(distances[2] / distances[0] - 1.25) < 0.001);
});



test('非法车型索引与损坏数组回退，不授予未购买载具或自动武器炮塔', () => {
  const p = freshProgress();
  const clean = validateProgress({
    ...p,
    vehicleIndex: 2,
    vehicleHulls: [-2, Infinity, 0],
    vehicleLoadouts: [99, 12, 0],
  });
  assert.deepEqual(clean.vehicleHulls, [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(clean.vehicleIndex, 5);
  assert.deepEqual(clean.vehicleLoadouts, [null, null, null, null, null, null, null]);
  const g = new Game(clean);
  assert.equal(g.selectVehicle(2), false);
});
