import { vehicleCombatFixture } from './helpers/vehicle-combat-fixture.mjs';
// 加特林热量回归：运转时间、自然冷却、装填连续性及各类持有者的独立状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,WEAPONS} from '../src/game.js';
import { gatlingHeat, advanceGatlingHeat, gatlingShotColor } from '../src/combat/weapon-heat.js';
import { consumeRound, advanceReload } from '../src/combat/magazine.js';
import { updateFunnel } from '../src/combat/funnel.js';
import { updateVehicle } from '../src/combat/vehicle.js';
const weapon = WEAPONS[2];

// 固定时间步模拟炮管运转，射击频率与弹夹大小可独立变化。
function firing(seconds, interval = 0.075, dt = 1 / 120) {
  const w = { ...weapon, interval, magazineSize: 10000 };
  const magazine = { ammo: w.magazineSize, remaining: 0 };
  let next = 0;
  for (let t = 0; t < seconds - 1e-8; t += dt) {
    if (t >= next - 1e-8) {
      consumeRound(magazine, w);
      next += interval;
    }
    advanceReload(magazine, w, dt);
  }
  return magazine;
}

// 稳定树靶覆盖正式的手持、炮塔与浮游炮入口，避免怪物移动打断射击。
function arena(kind = 'hand') {
  const p = freshProgress();
  p.weapons.fill(1);
  p.weapon = kind === 'funnel' ? 12 : 2;
  p.funnelLoadout = [2, 2, 2];
  p.vehicleWeapons[2] = 1;
  p.vehicleLoadouts[p.vehicleIndex||0] = 2;
  const g = vehicleCombatFixture(p, () => 0.5);
  g.start();
  g.enemies = [];
  g.trees = [];
  g.spawnTimer = 999;
  g.addTree(g.player.x + 150, g.player.y, { hp: 1e9, maxHp: 1e9 });
  g.setViewport(390, 844);
  g.reducedMotion = true;
  if (kind === 'vehicle') assert.ok(g.summonVehicle());
  return g;
}

// 通过各自生产更新入口推进时间，不在渲染侧改热量。
function step(g, seconds, kind = 'hand') {
  for (let t = 0; t < seconds - 1e-8; t += 1 / 120) {
    if (kind === 'funnel') updateFunnel(g, 1 / 120);
    else if (kind === 'vehicle') updateVehicle(g, 1 / 120);
    else g.update(1 / 120);
  }
}

test('低弹量和冷空仓不凭空变红，相同运转时间不受射速或弹量影响', () => {
  assert.equal(gatlingHeat(weapon, { ammo: 1, remaining: 0 }), 0);
  assert.equal(gatlingHeat(weapon, { ammo: 0, remaining: 3 }), 0);
  const fast = firing(2, 0.05),
    slow = firing(2, 0.1);
  assert.notEqual(fast.ammo, slow.ammo);
  assert.ok(Math.abs(fast.heat - 0.5) < 1e-8);
  assert.ok(Math.abs(fast.heat - slow.heat) < 1e-8);
  const burst = { ammo: 80, remaining: 0 };
  for (let i = 0; i < 79; i++) consumeRound(burst, weapon);
  assert.equal(gatlingHeat(weapon, burst), 0, '没有运行时间就不会因扣弹加热');
});

test('持续运转渐红，30/60/120帧一致，停火保持一发仍能回到冷色', () => {
  for (const fps of [30, 60, 120]) {
    const magazine = firing(4, 0.075, 1 / fps);
    assert.ok(magazine.heat > 0.99);
    magazine.ammo = 1;
    advanceReload(magazine, weapon, 0.2);
    assert.ok(magazine.heat < 1 && magazine.heat > 0.9);
    advanceReload(magazine, weapon, 3);
    assert.equal(gatlingHeat(weapon, magazine), 0);
    assert.equal(magazine.ammo, 1);
  }
});

test('换弹从实际温度渐降，不跳到全红，补满时归零且在途颜色快照不变', () => {
  const magazine = firing(2);
  magazine.ammo = 1;
  const before = gatlingHeat(weapon, magazine),
    color = gatlingShotColor(weapon, magazine);
  consumeRound(magazine, weapon);
  assert.equal(gatlingHeat(weapon, magazine), before);
  advanceReload(magazine, weapon, 1.5);
  assert.ok(Math.abs(magazine.heat - before / 2) < 1e-8);
  advanceReload(magazine, weapon, 1.5);
  assert.equal(magazine.heat, 0);
  assert.equal(magazine.ammo, weapon.magazineSize);
  assert.notEqual(gatlingShotColor(weapon, magazine), color);
  const cold = { ammo: 0, remaining: 3 };
  advanceReload(cold, weapon, 1);
  assert.equal(cold.heat, 0);
  const hot = { ammo: 0, remaining: 3, heat: 1 };
  for (let i = 0; i < 360; i++) advanceReload(hot, weapon, 1 / 120);
  assert.equal(hot.heat, 0);
  assert.equal(hot.ammo, weapon.magazineSize);
});

test('真实手持无目标冷却、暂停与切枪冻结，弹丸保留出膛热色', () => {
  const g = arena();
  step(g, 2);
  const mag = g.magazines[2];
  assert.ok(mag.heat > 0.4);
  const hot = mag.heat;
  g.attack();
  const bullet = g.projectiles.at(-1),
    color = bullet.color;
  mag.ammo = 1;
  g.trees = [];
  g.pause();
  step(g, 2);
  assert.equal(mag.heat, hot);
  g.pause();
  g.transact('weapons', 0, 'equip');
  step(g, 1);
  assert.equal(mag.heat, hot);
  g.transact('weapons', 2, 'equip');
  step(g, 3.3);
  assert.equal(mag.heat, 0);
  assert.equal(mag.ammo, 1);
  assert.equal(bullet.color, color);
});

test('炮塔和三个浮游炮各自加热与停火散热，返航散热不偷跑补给', () => {
  for (const kind of ['vehicle', 'funnel']) {
    const g = arena(kind);
    step(g, kind === 'funnel' ? 4 : 2, kind);
    const magazines =
      kind === 'vehicle' ? [g.vehicle.module.magazine] : g.funnel.nodes.map((n) => n.magazine);
    assert.ok(magazines.every((m) => m.heat > 0.2));
    assert.equal(g.magazines[2].heat, undefined, '独立炮不能加热手持枪');
    g.trees = [];
    for (const m of magazines) m.ammo = 1;
    step(g, 3.5, kind);
    assert.ok(magazines.every((m) => m.heat === 0 && m.ammo === 1));
  }
  const returning = { ammo: 0, remaining: 3, heat: 1 };
  advanceGatlingHeat(returning, weapon, 1);
  assert.ok(returning.heat < 1);
  assert.equal(returning.remaining, 3);
});
