// 气垫船的水陆通行、安全离船、独立成长及旧档兼容验收。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { vehicleModel } from '../src/config/vehicles.js';
import { equipmentRecipe } from '../src/progression/equipment-goals.js';
import { moveBody, blocked } from '../src/physics/motion.js';
import { groundPursuit, hoveringOverWater } from '../src/physics/ground-pursuit.js';
import { NATURAL_TERRAIN, isMountainBlocked } from '../src/world/natural-terrain.js';
import { riverXAt } from '../src/world/river-geometry.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';

// 提供确定的空战场，所有购买仍走正式交易入口。
function arena(board = true) {
  const p = freshProgress();
  Object.assign(p, { coins: 20000, wood: 10000, bosses: 30, materials: { parts: 1000, crystal: 1000, core: 100 } });
  const g = new Game(p, () => 0.5); g.start();
  g.enemies = []; g.trees = []; g.spawnTimer = g.attackTimer = 999;
  if (board) { assert.ok(g.buyVehicle(3)); assert.ok(g.selectVehicle(3)); assert.ok(g.summonVehicle()); }
  return g;
}

test('气垫船配方原子扣费，缺材料或战绩不能购买，炮塔独立', () => {
  const g = arena(false), cost = equipmentRecipe('vehicle', 3);
  assert.equal(vehicleModel(3).id, 'hovercraft');
  g.progress.bosses = 5;
  let before = JSON.stringify(g.progress);
  assert.equal(g.buyVehicle(3), false); assert.equal(JSON.stringify(g.progress), before);
  g.progress.bosses = 6; g.progress.materials.core = 2;
  before = JSON.stringify(g.progress);
  assert.equal(g.buyVehicle(3), false); assert.equal(JSON.stringify(g.progress), before);
  g.progress.materials.core = 3;
  assert.ok(g.buyVehicle(3)); assert.equal(g.buyVehicle(3), false);
  assert.equal(g.progress.coins, 20000 - cost.coins); assert.equal(g.progress.wood, 10000 - cost.wood);
  assert.equal(g.progress.materials.parts, 1000 - cost.parts);
  assert.equal(g.progress.materials.crystal, 1000 - cost.crystal); assert.equal(g.progress.materials.core, 0);
  assert.equal(g.vehicles[3].weaponIndex, 20); assert.equal(g.vehicle.index, 0);
});

test('驾驶气垫船横穿河流和两座湖泊，镜像坐标同样通行，普通车辆仍阻水', () => {
  const waters = [{ x: riverXAt(900), y: 900, rx: 65 }, ...NATURAL_TERRAIN.lakes];
  for (const water of waters) for (const offset of [0, WORLD.width]) {
    const g = arena(), start = water.x + offset - water.rx - 70, distance = 2 * (water.rx + 70);
    Object.assign(g.player, { x: start, y: water.y });
    assert.equal(g.player.flying, false); assert.equal(g.player.amphibious, true);
    moveBody(g.player, distance, 0, WORLD);
    assert.ok(Math.abs(g.player.x - start - distance) < 0.01);
    const tank = { x: start, y: water.y };
    moveBody(tank, distance, 0, WORLD);
    assert.ok(tank.x < water.x + offset);
  }
});

test('气垫船仍被树干与周期山体挡住，飞行能力不泄漏', () => {
  const g = arena(); Object.assign(g.player, { x: 700, y: 700 });
  const tree = { x: 760, y: 700, radius: 22, hp: 50 };
  moveBody(g.player, 120, 0, WORLD, 12, [tree]);
  assert.ok(g.player.x < tree.x - 33);
  for (const mountain of NATURAL_TERRAIN.mountains) {
    const x = mountain.x + WORLD.width, y = mountain.y;
    assert.ok(isMountainBlocked(x, y));
    Object.assign(g.player, { x: x - mountain.rx - 70, y });
    moveBody(g.player, mountain.rx + 70, 0, WORLD);
    assert.ok(g.player.x < x - 12); assert.equal(isMountainBlocked(g.player.x, g.player.y, 12), false);
  }
});

test('湖中下船、换车和击毁都回到安全岸边，清空惯性且保留驾驶员生命', () => {
  for (const action of ['dismount', 'switch', 'destroy']) {
    const g = arena(), lake = NATURAL_TERRAIN.lakes[0];
    Object.assign(g.player, { x: lake.x, y: lake.y, hp: 71, vx: 120, vy: 70, recoilX: 80, recoilY: 50 });
    const source = { ...g.player };
    if (action === 'dismount') assert.ok(g.dismountVehicle());
    if (action === 'switch') assert.ok(g.selectVehicle(0));
    if (action === 'destroy') { g.hurt(9999); assert.equal(g.vehicle.cooldown, 60); assert.equal(g.vehicle.hp, 0); }
    assert.equal(g.player.amphibious, false); assert.equal(g.player.flying, false);
    assert.equal(g.vehicle.active, false); assert.equal(g.player.hp, 71);
    assert.equal(blocked(g.player.x, g.player.y, 12, g.trees), false);
    assert.ok(worldDistance(source, g.player) < 320);
    assert.equal(g.player.vx, 0); assert.equal(g.player.vy, 0); assert.equal(g.player.recoilX, 0);
    if (action === 'switch') { assert.ok(g.summonVehicle()); assert.equal(g.player.amphibious, false); }
  }
});

test('正式更新水陆连续移动，岸边敌人不会因两栖目标进入水域', () => {
  const g = arena(), y = 900, x = riverXAt(y);
  Object.assign(g.player, { x: x - 80, y });
  for (let i = 0; i < 90; i++) g.update(1 / 60, { x: 1, y: 0 });
  assert.ok(g.player.x > x + 65);
  for (const water of [{ x, y }, NATURAL_TERRAIN.lakes[0]]) {
    Object.assign(g.player, { x: water.x, y: water.y });
    assert.ok(hoveringOverWater(g.player));
    const enemy = { id: 7, x: water.x - 300, y: water.y, radius: 12 };
    const chase = groundPursuit(enemy, g.player, 1 / 60);
    assert.equal(chase.holding, true); assert.equal(chase.direct, false);
    assert.equal(blocked(chase.goal.x, chase.goal.y), false);
  }
  g.dismountVehicle(); assert.equal(hoveringOverWater(g.player), false);
});

test('旧三车型存档补齐未拥有气垫船，新船等级可保存且自带潮汐炮且读档从步战开始', () => {
  const old = freshProgress(); old.vehicleHulls = [1, 3, 2]; old.vehicleLoadouts = [null, null, null];
  const migrated = validateProgress(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(migrated.vehicleHulls, [1, 3, 2, 0]);
  assert.deepEqual(migrated.vehicleLoadouts, [17,18,19,null]);
  const g = arena();
  g.vehicle.hp /= 2; assert.ok(g.upgradeVehicle());
  assert.equal(g.vehicle.hp, 175); assert.equal(g.vehicle.maxHp, 350);
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.vehicle.index, 3); assert.equal(restored.vehicle.maxHp, 350);
  assert.equal(restored.vehicle.weaponIndex, 20); assert.equal(restored.vehicle.active, false);
  assert.equal(restored.player.amphibious, false);
});
