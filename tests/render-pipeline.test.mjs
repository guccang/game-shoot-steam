// 分块覆盖、缓存有界和环境色过渡的确定性回归，不依赖设备速度断言。
import test from 'node:test';
import assert from 'node:assert/strict';
import { groundTiles, GROUND_TILE_SIZE, GROUND_CACHE_LIMIT } from '../src/rendering/ground-cache.js';
import { SceneTone, toneValues } from '../src/rendering/scene-tone.js';
import { RiverRenderer } from '../src/rendering/river.js';
import { WORLD } from '../src/world/coordinates.js';
import { alignedTileRect } from '../src/rendering/tile-blit.js';

test('不同缩放和小数镜头下相邻块严格共享像素边界', () => {
  for (const scale of [0.55, 0.6, 0.85, 1.1, 1.7, 2.5]) {
    const matrix = { a: scale, d: scale, e: -671.67 * scale, f: -289.91 * scale };
    const left = alignedTileRect(matrix, 384, 384, 384, 384);
    const right = alignedTileRect(matrix, 768, 384, 384, 384);
    const bottom = alignedTileRect(matrix, 384, 768, 384, 384);
    assert.ok(Math.abs(left.x + left.w - right.x) < 1e-8);
    assert.ok(Math.abs(left.y + left.h - bottom.y) < 1e-8);
    assert.ok(Math.abs(left.sx) < 1 && Math.abs(left.sy) < 1);
    assert.ok(Math.abs(left.x * scale + matrix.e - Math.round(left.x * scale + matrix.e)) < 1e-8);
  }
});

test('地面分块精确覆盖可见区域，跨边和角落复用规范坐标', () => {
  for (const view of [
    { x: 670, y: 290, w: 457, h: 880 },
    { x: -100, y: -100, w: 580, h: 1000 },
    { x: 3500, y: 2700, w: 580, h: 1000 },
    { x: -3700, y: 5500, w: 980, h: 1600 },
  ]) {
    const tiles = groundTiles(view);
    let area = 0;
    for (const tile of tiles) {
      assert.ok(tile.x >= 0 && tile.x < WORLD.width);
      assert.ok(tile.y >= 0 && tile.y < WORLD.height);
      assert.ok(tile.w > 0 && tile.w <= GROUND_TILE_SIZE);
      assert.ok(tile.h > 0 && tile.h <= GROUND_TILE_SIZE);
      const x = tile.x + tile.ox, y = tile.y + tile.oy;
      area += Math.max(0, Math.min(x + tile.w, view.x + view.w) - Math.max(x, view.x)) *
        Math.max(0, Math.min(y + tile.h, view.y + view.h) - Math.max(y, view.y));
    }
    assert.equal(area, view.w * view.h);
    assert.ok(new Set(tiles.map(t => t.key)).size <= GROUND_CACHE_LIMIT);
  }
});

test('河道真实边界排除出生点透明区，减少动态模式不分配缓存', () => {
  const river = new RiverRenderer();
  const view = { x: 671, y: 289, w: 457, h: 880 };
  river.draw({}, 2, 0, 0, false, view);
  assert.equal(river.stats().count, 0);
  assert.equal(river.stats().strips, 0);
  river.draw({}, 4, 1, 1, true, { x: 1100, y: 400, w: 400, h: 900 });
  assert.equal(river.stats().count, 0);
  assert.ok(river.bounds.every(b => Number.isFinite(b.w) && b.w > 0 && b.w < 310));
});

test('昼晴无需全屏合成，切换环境仍缓慢过渡且不重置进行中的分量', () => {
  const tone = new SceneTone({ time: 'day', weather: 'sun' }, 0);
  tone.draw({}, 390, 844, { time: 'day', weather: 'sun' }, 100, false);
  const night = { time: 'night', weather: 'sun' };
  tone.set(night, 1000);
  assert.equal(tone.sample(1000).night, 0);
  assert.ok(tone.sample(11000).night > 0 && tone.sample(11000).night < 1);
  const before = tone.sample(11000);
  tone.set({ time: 'night', weather: 'thunder' }, 11000);
  assert.deepEqual(tone.sample(11000), before);
  assert.equal(tone.sample(16000).night, 1);
  assert.deepEqual(tone.sample(26000), toneValues({ time: 'night', weather: 'thunder' }));
});

test('快速昼夜切换从当前色继续，减少动态立即到达目标', () => {
  const tone = new SceneTone({ time: 'day', weather: 'sun' }, 0);
  tone.set({ time: 'dusk', weather: 'sun' }, 0);
  const before = tone.sample(7000);
  tone.set({ time: 'night', weather: 'rain' }, 7000);
  assert.deepEqual(tone.sample(7000), before);
  assert.deepEqual(tone.sample(7000, true), toneValues({ time: 'night', weather: 'rain' }));
});
