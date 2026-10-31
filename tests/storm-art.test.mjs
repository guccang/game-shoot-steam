// 天气视觉时序与循环坐标契约，不依赖浏览器或游戏随机源。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHTNING_CLIP, lightningFrame, StormCycle } from '../src/world/storm.js';
import { RAIN_CELL, rainSample } from '../src/world/precipitation.js';
import { WORLD } from '../src/world/coordinates.js';

test('闪电逐帧播放完整的非循环片段，离开天气和低动态状态完全关闭闪光', () => {
  assert.equal(LIGHTNING_CLIP.fps, 24);
  assert.equal(lightningFrame(-0.01), -1);
  for (let i = 0; i < LIGHTNING_CLIP.frames; i++) assert.equal(lightningFrame((i + 0.1) / 24), i);
  assert.equal(lightningFrame(LIGHTNING_CLIP.duration), -1);
  const storm = new StormCycle();
  storm.sample(0, true);
  assert.equal(storm.sample(2000, true).frame, 0);
  assert.equal(storm.sample(2350, true).frame, 8);
  assert.equal(storm.sample(2800, true).frame, -1);
  assert.equal(storm.sample(3100, true).thunder, true);
  assert.equal(storm.sample(3200, true).thunder, false);
  assert.equal(storm.sample(13350, true, true).frame, -1);
  assert.equal(storm.sample(13350, true, true).flash, 0);
  assert.equal(storm.sample(14000, false).frame, -1);
  assert.equal(storm.sample(15000, true).frame, -1);
});

test('雨滴固定落点跨地图接缝一致，重复采样不消耗或重排随机状态', () => {
  const a = rainSample(-1, 8, 12.3, 1);
  const b = rainSample(
    -1 + WORLD.width / RAIN_CELL.width,
    8 + WORLD.height / RAIN_CELL.height,
    12.3,
    1,
  );
  for (const key of ['n', 'splash', 'falling', 'wind', 'width', 'length'])
    assert.equal(a[key], b[key]);
  assert.ok(Math.abs(b.x - a.x - WORLD.width) < 1e-8);
  assert.ok(Math.abs(b.dropY - a.dropY - WORLD.height) < 1e-8);
  assert.deepEqual(rainSample(-1, 8, 12.3, 1), a);
});

test('每滴雨连续落到自身水花位置，时序具有速度长度差异且雨场规模不随时间增长', () => {
  const values = [];
  for (let t = 0; t < 2; t += 0.001) values.push(rainSample(4, 7, t, 1));
  const impact = values.findIndex((v, i) => i && !v.falling && values[i - 1].falling);
  assert.ok(impact > 0);
  const before = values[impact - 1],
    after = values[impact];
  assert.ok(Math.abs(before.dropX - after.x) < 2);
  assert.ok(Math.abs(before.dropY - after.y) < 2);
  assert.ok(after.splash >= 0 && after.splash < 0.01);
  const samples = Array.from({ length: 20 }, (_, i) => rainSample(i, i, 86400, 1));
  assert.ok(new Set(samples.map((v) => v.length)).size > 15);
  assert.ok(new Set(samples.map((v) => v.width)).size > 15);
  assert.ok(samples.every((v) => Number.isFinite(v.dropX) && Number.isFinite(v.dropY)));
});
