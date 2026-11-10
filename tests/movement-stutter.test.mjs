// 优化必须保持原河道查询结果、伙伴通行和循环世界的一致性。
import test from 'node:test';
import assert from 'node:assert/strict';
import { riverSamples, riverXAt, riverHalfWidth, isWaterScenery, BRIDGES, WATERFALL } from '../src/world/river-geometry.js';
import { canonical, WORLD } from '../src/world/coordinates.js';
import { NATURAL_TERRAIN } from '../src/world/natural-terrain.js';
import { naturalWaypoint, terrainLineClear, terrainBlocked } from '../src/physics/terrain-navigation.js';

// 保留优化前的线性插值作为独立参照，包括原有越界语义。
function originalRiverX(y) {
  const i = riverSamples.findIndex(p => p.y >= y);
  if (i <= 0) return riverSamples[Math.max(0, i)].x;
  const a = riverSamples[i - 1], b = riverSamples[i];
  return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y));
}

// 保留全扫描参照，检查桥头、瀑布、河湾和周期接缝的留白不被优化改变。
function originalScenery(x, y) {
  ({ x, y } = canonical({ x, y }));
  if (BRIDGES.some(b=>x>b.x-35&&x<b.x+b.width+35&&y>b.y-35&&y<b.y+b.height+35)) return true;
  if (x > 1128 && x < 1312 && y > WATERFALL.y - 40 && y < WATERFALL.y + 180) return true;
  return riverSamples.some(p => Math.hypot(p.x - x, p.y - y) < riverHalfWidth(p.y, x < p.x ? -1 : 1) + 23);
}

test('二分插值与原扫描逐点相同，保留端点、越界和非有限值', () => {
  for (const y of [-Infinity, -1, 0, WORLD.height, WORLD.height + 1, Infinity, NaN,
    ...riverSamples.flatMap(p => [p.y - 1e-7, p.y, p.y + 1e-7])]) assert.equal(riverXAt(y), originalRiverX(y));
});

test('邻域查询与全河道扫描完全一致，包括负坐标和循环镜像', () => {
  for (let y = -100; y < WORLD.height + 100; y += 11.3)
    for (let x = 1080; x < 1440; x += 7.7) {
      assert.equal(isWaterScenery(x, y), originalScenery(x, y));
      assert.equal(isWaterScenery(x - WORLD.width, y + WORLD.height), originalScenery(x - WORLD.width, y + WORLD.height));
    }
});

test('重复使用静态导航边后仍绕湖，周期镜像与地图切换不污染路径', () => {
  for (const shift of [0, WORLD.width, -WORLD.width])
    for (const lake of NATURAL_TERRAIN.lakes) {
      const body = { x: lake.x - lake.rx - 70 + shift, y: lake.y, mapId: 'forest' };
      const goal = { x: lake.x + lake.rx + 70 + shift, y: lake.y };
      if (terrainBlocked(body.x, body.y) || terrainBlocked(goal.x, goal.y)) continue;
      const point = naturalWaypoint(body, goal), repeated = naturalWaypoint({ ...body }, goal);
      assert.deepEqual(repeated, point);
      assert.ok(Math.hypot(point.x - body.x, point.y - body.y) > 1);
      assert.equal(terrainLineClear(body, point), true);
    }
  const valley = { x: 580, y: 640, mapId: 'jiuzhaigou' };
  const point = naturalWaypoint(valley, { x: 1430, y: 640 });
  assert.ok(Math.hypot(point.x - valley.x, point.y - valley.y) > 1);
  assert.equal(terrainLineClear(valley, point), true);
});

test('不可达端点继续原地等待，不会用缓存路线穿越湖水', () => {
  const lake = NATURAL_TERRAIN.lakes[0];
  const body = { x: lake.x - lake.rx - 70, y: lake.y, mapId: 'forest' };
  assert.deepEqual(naturalWaypoint(body, lake), { x: body.x, y: body.y });
});
