// 电动车骑手攻击、目录固定编号、付费战车与存档幂等回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, freshRangerProgress, validateProgress } from '../src/progression/progress.js';
import { VEHICLE_DISPLAY_ORDER, COLLECTED_VEHICLES } from '../src/config/vehicles.js';
import { riderPosition, SCOOTER_RIDER_LIFT } from '../src/config/vehicle-rider.js';
import { shotSolution } from '../src/combat/aim.js';
import { createWorkshopTrial } from '../src/core/workshop-trial.js';
import { transactVehicle } from '../src/progression/vehicles.js';
import { equipmentRecipe } from '../src/progression/equipment-goals.js';

// 真实更新中的静止耐久靶，不生成额外波次或读写用户存档。
function arena(weapon = 0) {
  const p = freshProgress(); p.weapons.fill(1); p.weapon = weapon;
  const g = new Game(p, () => .5); g.state = 'playing'; g.trees = []; g.enemies = []; g.updateWaves = () => {};
  Object.assign(g.player, { x: 900, y: 750 });
  const target = g.spawnEnemy(0, 100, { x: 1060, y: 723 });
  Object.assign(target, { hp: 100000, maxHp: 100000, speed: 0, damage: 0 });
  assert.equal(g.summonVehicle(), true);
  return g;
}
// 固定步长推进，供蓄能与召唤调度使用。
function tick(g, seconds) { for (let i = 0; i < seconds * 60; i++) g.update(1 / 60); }

test('手枪从骑手枪口开火，沿用手持弹仓且电动车无炮塔', () => {
  const g = arena(); const ammo = g.magazines[0].ammo;
  const expected = shotSolution(riderPosition(g.player, g.vehicle), g.enemies[0], 0);
  g.player.angle = expected.angle;
  assert.equal(g.attack(), true); assert.equal(g.magazines[0].ammo, ammo - 1);
  assert.equal(g.vehicle.module, null);
  assert.equal(g.projectiles[0].x, expected.muzzle.x); assert.equal(g.projectiles[0].y, expected.muzzle.y);
  g.updateProjectiles(.4); assert.ok(g.enemies[0].hp < 100000);
});

test('上下车不补弹、不清装填或特殊武器冷却，地面坐标保持不变', () => {
  const g = arena(); const origin = { x: g.player.x, y: g.player.y };
  g.magazines[0].ammo = 2; g.magazines[0].remaining = .9; g.pulse.cooldown = 1.2;
  const magazine = { ...g.magazines[0] };
  assert.equal(riderPosition(g.player, g.vehicle).y, origin.y - SCOOTER_RIDER_LIFT);
  g.dismountVehicle(); g.summonVehicle();
  assert.deepEqual(g.magazines[0], magazine); assert.equal(g.pulse.cooldown, 1.2);
  assert.deepEqual({ x: g.player.x, y: g.player.y }, origin);
});

test('骑乘脉冲蓄力攻击与机械核心召唤继续运行', () => {
  const pulse = arena(11); let shots = 0; pulse.onEvent = kind => { if (kind === 'shot') shots++; };
  tick(pulse, 8); assert.ok(shots > 0);
  const core = arena(15); tick(core, 8);
  assert.ok(core.mechanical.nodes.some(n => n.active));
});

test('电动车工坊试射使用手持枪，来源存档与弹药不变', () => {
  const p = freshProgress(), before = JSON.stringify(p), trial = createWorkshopTrial(p, 'vehicle', 5);
  for (let i = 0; i < 600; i++) trial.advance(1 / 60);
  assert.ok(trial.destroyed > 0); assert.equal(trial.game.vehicle.module, null);
  assert.equal(JSON.stringify(p), before);
});

test('电动车置顶但固定编号不变，新档不赠战车，600金币240木材买车附带机枪', () => {
  assert.deepEqual(VEHICLE_DISPLAY_ORDER, [5,0,1,2,3,4]);
  assert.equal(COLLECTED_VEHICLES[0].id, 'pine-tank'); assert.equal(COLLECTED_VEHICLES[5].id, 'ranger-scooter');
  const p = freshProgress(); assert.equal(p.vehicleHulls[0], 0); assert.equal(p.vehicleWeapons[17], 0);
  assert.equal(freshRangerProgress().vehicleHulls[0], 0);
  const cost = equipmentRecipe('vehicle', 0, p);
  assert.equal(cost.coins, 600); assert.equal(cost.wood, 240);
  p.coins = 599; p.wood = 240; const before = JSON.stringify(p);
  assert.equal(transactVehicle(p, 'vehicle', 0, 'buy'), false); assert.equal(JSON.stringify(p), before);
  p.coins = 600; assert.equal(transactVehicle(p, 'vehicle', 0, 'buy'), true);
  assert.equal(p.coins, 0); assert.equal(p.wood, 0); assert.equal(p.vehicleHulls[0], 1);
  assert.equal(p.vehicleWeapons[17], 1); assert.equal(p.vehicleLoadouts[0], 17);
  assert.equal(transactVehicle(p, 'vehicle', 0, 'buy'), false);
});

test('明确未购买的零记录不被补发，现代与旧版已拥有战车不回收不收费', () => {
  const p = freshProgress(); p.vehicleIndex = 0;
  const saved = validateProgress(JSON.parse(JSON.stringify(p)));
  assert.equal(saved.vehicleHulls[0], 0); assert.equal(saved.vehicleWeapons[17], 0);
  assert.equal(saved.vehicleIndex, 5); assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(saved))), saved);
  for (const raw of [{ ...saved, vehicleHulls: [6,0,0,0,0,1], vehicleIndex: 0 },
    { version: 1, coins: 71, wood: 34, vehicleLevel: 6 }]) {
    const old = validateProgress(raw); assert.equal(old.vehicleHulls[0], 6);
    assert.equal(old.coins, raw.coins); assert.equal(old.wood, raw.wood);
    assert.equal(old.vehicleWeapons[17], 1);
    assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(old))), old);
  }
});
