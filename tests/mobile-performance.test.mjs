// 移动端优化的等价性回归：分桶不改变碰撞顺序，缓存不改变雨滴落点。
import test from 'node:test';
import assert from 'node:assert/strict';
import { BodyGrid } from '../src/physics/body-grid.js';
import { stepBodies } from '../src/physics/motion.js';
import { WORLD } from '../src/world/coordinates.js';
import { RainSurfaces } from '../src/world/rain-surfaces.js';
import { rainSample, RAIN_CELL } from '../src/world/precipitation.js';
import { isWaterBlocked } from '../src/world/river-geometry.js';
import { isLakeWater } from '../src/world/natural-terrain.js';
import { pathDistance } from '../src/world/biomes.js';

// 用原双循环的全部后续编号作参考，物理求解器、时间步长及回调完全相同。
function bruteAfter(index, previous = index) {
  return Array.from({ length: this.bodies.length - previous - 1 }, (_, i) => previous + i + 1);
}

test('分桶与全部成对扫描逐值一致：挤压、滚地、连续冲量、大半径、河岸、地图接缝', () => {
  const indexedAfter = BodyGrid.prototype.after;
  for (const [cx, cy] of [[900, 700], [3595, 2790], [-3605, -2810], [1200, 720]]) {
    const bodies = Array.from({ length: 49 }, (_, id) => ({
      id, type: id === 48 ? 'boss' : 'enemy', hp: 100,
      x: cx + (id % 7) * 24, y: cy + Math.floor(id / 7) * 25,
      radius: id === 48 ? 65 : 14 + id % 9, mass: 1 + id % 4,
      pushX: Math.cos(id * 2.7) * 410, pushY: Math.sin(id * 1.3) * 350,
      assault: { phase: 'lunge', elapsed: 0.1 }, z: id % 3 * 3, vz: id % 4 * 12,
    }));
    const indexed = structuredClone(bodies), reference = structuredClone(bodies);
    const trees = [{ x: cx + 200, y: cy + 80, hp: 30, radius: 16 }];
    const actual = [], expected = [];
    for (let frame = 0; frame < 35; frame++) {
      const dt = frame % 3 ? 1 / 60 : 0.05;
      stepBodies(indexed, dt, WORLD, (a, b, speed) => actual.push([a.id, b?.id, speed]), trees);
      try {
        BodyGrid.prototype.after = bruteAfter;
        stepBodies(reference, dt, WORLD, (a, b, speed) => expected.push([a.id, b?.id, speed]), trees);
      } finally {
        BodyGrid.prototype.after = indexedAfter;
      }
      assert.deepEqual(indexed, reference, `位置 ${cx},${cy}，第 ${frame} 帧`);
      assert.deepEqual(actual, expected);
    }
    assert.ok(actual.some((hit) => hit[1] !== undefined), '确实发生了单位间连锁碰撞');
  }
});

test('分散刚体只查询邻桶，移动后立即发现新增候选，顺序不依赖桶顺序', () => {
  const bodies = Array.from({ length: 96 }, (_, i) => ({
    x: (i % 12) * 290, y: Math.floor(i / 12) * 300, radius: 17,
  }));
  const grid = new BodyGrid(bodies);
  assert.ok(bodies.reduce((sum, _, i) => sum + grid.after(i).length, 0) < 96);
  bodies[95].x = WORLD.width - 5; bodies[95].y = 0; grid.update(95);
  assert.deepEqual(grid.after(0), [95]);
  bodies[20].x = 10; bodies[20].y = 0; grid.update(20);
  assert.deepEqual(grid.after(0), [20, 95]);
  assert.deepEqual(grid.after(0, 20), [95]);
});

test('雨滴地表缓存与原几何判定一致，跨地图与天气切换共用有限缓存', () => {
  const surfaces = new RainSurfaces();
  // 扩图后仍检查完整世界与跨周期镜像，不能沿用旧地图的 60×40 网格。
  const columns = WORLD.width / RAIN_CELL.width, rows = WORLD.height / RAIN_CELL.height;
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const drop = rainSample(column, row, 5, 1);
      const expected = isWaterBlocked(drop.x, drop.y, 0) || isLakeWater(drop.x, drop.y)
        ? 'water' : pathDistance(drop.x, drop.y) < 26 ? 'path' : 'grass';
      assert.equal(surfaces.groundAt(drop), expected);
      assert.equal(surfaces.groundAt(rainSample(column - columns, row + rows * 2, 200, 0)), expected);
    }
  assert.equal(surfaces.terrain.size, columns * rows);
});

test('树冠查询保持原选择顺序，砍倒和重生立即改变遮挡，不污染地表缓存', () => {
  const surfaces = new RainSurfaces(), drop = rainSample(15, 10, 2, 1);
  const trees = [
    { x: drop.x + 12, y: drop.y + 4, size: 1.4, hp: 100, radius: 14 },
    { x: drop.x - 1, y: drop.y, size: 0.9, hp: 100, radius: 12 },
  ];
  const ground = surfaces.groundAt(drop);
  surfaces.setTrees(trees);
  assert.equal(surfaces.canopyAt(drop), trees[0]);
  trees[0].hp = 0;
  assert.equal(surfaces.canopyAt(drop), trees[1]);
  surfaces.setTrees([]);
  assert.equal(surfaces.canopyAt(drop), null);
  assert.equal(surfaces.groundAt(drop), ground);
  surfaces.setTrees([trees[1]]);
  assert.equal(surfaces.canopyAt(drop), trees[1]);
});
