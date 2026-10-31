// 闪电使用固定场景落点，验证镜头运动、缩放及跨界后的各层投影和生命周期。
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStormStrike, projectStormStrike, drawStormGround } from '../src/rendering/storm.js';
import { LIGHTNING_ATLAS } from '../src/rendering/weather-atlas.js';
import { StormCycle } from '../src/world/storm.js';
import { WORLD } from '../src/world/coordinates.js';

const view = { x: 700, y: 500, width: 390, height: 844, w: 650, h: 844 / 0.6, zoom: 0.6 };
const storm = { cycle: 0, frame: 8, age: 0.35, flash: 1 };

// 浮点投影允许舍入误差，不允许跟随镜头漂移。
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }

test('同一次放电的落点和世界尺寸不随四向镜头运动改变', () => {
  const strike = prepareStormStrike(null, view, storm, 'forest', 1);
  const before = projectStormStrike(strike, view);
  for (const [dx, dy] of [[120, 0], [-120, 0], [0, 90], [0, -90]]) {
    const moved = { ...view, x: view.x + dx, y: view.y + dy };
    assert.equal(prepareStormStrike(strike, moved, { ...storm, frame: 12 }, 'forest', 0.8), strike);
    const after = projectStormStrike(strike, moved);
    close(after.x - before.x, -dx * view.zoom);
    close(after.groundY - before.groundY, -dy * view.zoom);
    close(after.glowY - before.glowY, -dy * view.zoom);
    close(after.scale, before.scale);
  }
});

test('镜头缩放与横竖屏变化只改变投影，不改变电弧世界尺寸和落点', () => {
  const strike = prepareStormStrike(null, view, storm, 'forest', 1);
  const resized = { ...view, width: 844, height: 390, zoom: 1.2, w: 844 / 1.2, h: 325 };
  assert.equal(prepareStormStrike(strike, resized, storm, 'forest', 1), strike);
  const before = projectStormStrike(strike, view), after = projectStormStrike(strike, resized);
  for (const key of ['x', 'groundY', 'scale', 'glowY', 'glowRadius', 'reflectionRadius']) close(after[key], before[key] * 2);
  close(after.y + LIGHTNING_ATLAS.anchor[1] * after.scale, after.groundY);
});

test('循环世界接缝使用同一个闪电落点的最近镜像', () => {
  const edge = { ...view, x: WORLD.width - 120, y: WORLD.height - 80 };
  const strike = prepareStormStrike(null, edge, storm, 'forest', 1);
  const wrapped = { ...edge, x: edge.x - WORLD.width + 50, y: edge.y - WORLD.height + 40 };
  const before = projectStormStrike(strike, edge), after = projectStormStrike(strike, wrapped);
  close(after.x - before.x, -50 * view.zoom);
  close(after.groundY - before.groundY, -40 * view.zoom);
});

test('地面受光使用电弧落点，镜头移动后不跟随视口重新布置', () => {
  const strike = prepareStormStrike(null, view, storm, 'forest', 1), centers = [];
  const context = { save() {}, restore() {}, fillRect() {},
    createRadialGradient(x, y) { centers.push({ x, y }); return { addColorStop() {} }; } };
  for (const dx of [0, 160]) {
    const moved = { ...view, x: view.x + dx };
    drawStormGround(context, moved, [], 1, storm, false, strike);
    const screen = projectStormStrike(strike, moved), center = centers.at(-1);
    close((center.x - moved.x) * moved.zoom, screen.x);
    close((center.y - moved.y) * moved.zoom, screen.groundY);
  }
  assert.deepEqual(centers[0], centers[1]);
  drawStormGround(context, view, [], 1, storm, true, strike);
  assert.equal(centers.length, 2);
});

test('帧零固定落点，下一轮和换场景重建，结束或关闭天气及减少动态清理', () => {
  const cycle = new StormCycle();
  cycle.sample(0, true);
  const first = prepareStormStrike(null, view, cycle.sample(2000, true), 'forest', 1);
  assert.ok(first);
  assert.equal(prepareStormStrike(first, view, cycle.sample(2350, true), 'forest', 1), first);
  assert.equal(prepareStormStrike(first, view, cycle.sample(2800, true), 'forest', 1), null);
  const moved = { ...view, x: view.x + 500 };
  const second = prepareStormStrike(first, moved, cycle.sample(13350, true), 'forest', 1);
  assert.notEqual(second, first);
  assert.notEqual(second.x, first.x);
  assert.notEqual(prepareStormStrike(first, moved, storm, 'jiuzhaigou', 1), first);
  assert.equal(prepareStormStrike(first, view, storm, 'forest', 0), null);
  assert.equal(prepareStormStrike(first, view, storm, 'forest', 1, true), null);
  assert.equal(prepareStormStrike(first, view, cycle.sample(14000, false), 'forest', 1), null);
});
