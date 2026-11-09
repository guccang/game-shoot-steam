// 地貌回归覆盖种子稳定性、留白、碰撞、实际绕行、飞行目标与周期地图。
import test from 'node:test';
import assert from 'node:assert/strict';
import { NATURAL_TERRAIN as terrain, generateNaturalTerrain, riverBeachWidth,
  isNaturalBlocked, isLakeWater, touchesLandform, TERRAIN_RESERVES } from '../src/world/natural-terrain.js';
import { PATHS } from '../src/world/paths.js';
import { WORLD } from '../src/world/coordinates.js';
import { forestLayout } from '../src/world/biomes.js';
import { moveBody, drySpawn, clearWaterPath, navigationTarget } from '../src/physics/motion.js';
import { groundPursuit } from '../src/physics/ground-pursuit.js';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { BRIDGE, riverXAt } from '../src/world/river-geometry.js';
import { RainSurfaces } from '../src/world/rain-surfaces.js';
import { createEnemyAttack, updateEnemyAttack } from '../src/combat/enemy-attack.js';
import { landingPoint } from '../src/combat/vehicle-landing.js';

test('地貌可序列化且种子复现，独立候选区和空配置可供后续随机地图使用', () => {
  // 扩图后的山湖按面积配额生成；数量不再固定为旧版十处，精确面积由专项审计覆盖。
  assert.ok(terrain.lakes.some(i=>i.regional)); assert.ok(terrain.mountains.some(i=>i.regional));
  assert.deepEqual(generateNaturalTerrain(), terrain);
  assert.deepEqual(JSON.parse(JSON.stringify(terrain)), terrain);
  assert.notDeepEqual(generateNaturalTerrain({ seed: 744 }), terrain);
  const empty = generateNaturalTerrain({ seed: 0, lakeZones: [], mountainZones: [], beachZones: [] });
  assert.equal(empty.obstacles.length, 0); assert.equal(empty.beaches.length, 0);
  assert.throws(() => generateNaturalTerrain({ seed: NaN }), /种子/);
  const rejected = generateNaturalTerrain({ lakeZones: [{ x: 900, y: 700, rx: 80, ry: 60 }], mountainZones: [] });
  assert.equal(rejected.lakes.length, 0);
});

test('多个种子的地标不占营地、主路和河桥；沙滩两岸面积与出现位置独立', () => {
  for (let seed = 0; seed < 12; seed++) {
    const t = generateNaturalTerrain({ seed });
    for (const item of t.obstacles) {
      for (const path of PATHS) for (const p of path) assert.equal(touchesLandform(item, p.x, p.y, 45), false);
      for (const r of TERRAIN_RESERVES) for (const x of [r.x, r.x + r.w / 2, r.x + r.w])
        for (const y of [r.y, r.y + r.h / 2, r.y + r.h]) assert.equal(touchesLandform(item, x, y, 12), false);
    }
    assert.equal(riverBeachWidth(BRIDGE.y, -1, t), 0);
    assert.equal(riverBeachWidth(BRIDGE.y + BRIDGE.height, 1, t), 0);
  }
  assert.ok(riverBeachWidth(975, -1) > 60); assert.equal(riverBeachWidth(975, 1), 0);
  assert.ok(riverBeachWidth(1230, 1) > 20); assert.equal(riverBeachWidth(1230, -1), 0);
  assert.ok(riverBeachWidth(1720, 1) > 70); assert.equal(riverBeachWidth(1720, -1), 0);
});

test('湖水和山脚禁止地面高速穿越，空中单位可越过且循环镜像判定一致', () => {
  // 实体地貌仍整座阻挡；开放群峰与可走雨林分别由专项验证底座、间隙和树干。
  for (const item of terrain.obstacles.filter(i=>!i.regional&&i.kind!=='rainforest')) {
    assert.ok(isNaturalBlocked(item.x, item.y));
    assert.ok(isNaturalBlocked(item.x + WORLD.width, item.y - WORLD.height));
    for (const sign of [-1, 1]) {
      const left = item.x + item.bounds.x - 35, right = left + item.bounds.w + 70;
      const x = sign < 0 ? left : right, body = { x, y: item.y };
      const dx = -sign * (right - left);
      moveBody(body, dx, 0, WORLD);
      assert.ok(sign * (body.x - item.x) > 0); assert.equal(terrainBlocked(body.x, body.y), false);
      const flying = { x, y: item.y, flying: true }; moveBody(flying, dx, 0, WORLD);
      assert.ok(sign * (flying.x - item.x) < 0);
    }
    const spawn = drySpawn({ x: item.x, y: item.y }); assert.equal(terrainBlocked(spawn.x, spawn.y), false);
    assert.equal(clearWaterPath({ x: item.x - item.rx * 1.3 - 60, y: item.y },
      { x: item.x + item.rx * 1.3 + 60, y: item.y }), false);
  }
});

test('追兵实际绕过湖山抵达另一侧，不穿障碍或错误跑向木桥', () => {
  for (const item of terrain.obstacles.filter(i=>!i.regional)) {
    const body = { x: item.x + item.bounds.x - 35, y: item.y },
      target = { x: item.x + item.bounds.x + item.bounds.w + 35, y: item.y };
    for (let step = 0; step < 900 && Math.hypot(body.x - target.x, body.y - target.y) > 5; step++) {
      const goal = navigationTarget(body, target), dx = goal.x - body.x, dy = goal.y - body.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      moveBody(body, dx / distance * Math.min(4, distance), dy / distance * Math.min(4, distance), WORLD);
      assert.equal(terrainBlocked(body.x, body.y), false);
    }
    assert.ok(Math.hypot(body.x - target.x, body.y - target.y) < 6, `${item.id} 未绕行抵达`);
  }
  const body = { x: riverXAt(900) - 100, y: 900 }, target = { x: riverXAt(900) + 100, y: 900 };
  assert.ok(navigationTarget(body, target).y < 900);
});

test('湖面飞行目标只引导地面追兵到本地岸边，雨滴和植被正确识别湖泊', () => {
  const lake = terrain.lakes[0], target = { x: lake.x, y: lake.y, flying: true };
  const body = { x: lake.x + lake.rx * 1.3 + 70, y: lake.y, radius: 17 };
  for (let i = 0; i < 180; i++) {
    const pursuit = groundPursuit(body, target, 1 / 30);
    assert.equal(pursuit.holding, true); assert.equal(pursuit.direct, false);
    assert.ok(pursuit.goal.x > 1400);
    const dx = pursuit.goal.x - body.x, dy = pursuit.goal.y - body.y, d = Math.max(1, Math.hypot(dx, dy));
    moveBody(body, dx / d * Math.min(3, d), dy / d * Math.min(3, d), WORLD);
    assert.equal(terrainBlocked(body.x, body.y), false);
  }
  const rain = new RainSurfaces(); assert.equal(rain.groundAt({ x: lake.x, y: lake.y, seed: 99 }), 'water');
  assert.equal(isLakeWater(terrain.mountains[0].x, terrain.mountains[0].y), false);
  for (const tree of forestLayout()) assert.equal(isNaturalBlocked(tree.x, tree.y, 35), false);
});

test('正式敌人追击绕过地貌才开始攻击，直升机在湖山上方能找到安全落点', () => {
  for (const item of [terrain.lakes[0], terrain.mountains[0]]) {
    const enemy = { x: item.x + item.bounds.x - 35, y: item.y, hp: 1000, speed: 60, radius: 17,
      type: 'enemy', assault: createEnemyAttack() };
    const player = { x: item.x + item.bounds.x + item.bounds.w + 35, y: item.y };
    let attacked = false;
    for (let i = 0; i < 1200; i++) {
      const damage = updateEnemyAttack(enemy, player, player, 1 / 30, WORLD);
      assert.equal(terrainBlocked(enemy.x, enemy.y), false);
      if (damage) { assert.ok(clearWaterPath(enemy, player)); attacked = true; break; }
    }
    assert.ok(attacked, `${item.id} 没有完成追击`);
    const point = landingPoint({ x: item.x + WORLD.width, y: item.y, flying: true }, []);
    assert.ok(point); assert.equal(terrainBlocked(point.x, point.y), false);
    assert.ok(Math.abs(point.x - item.x - WORLD.width) < 400);
  }
});
