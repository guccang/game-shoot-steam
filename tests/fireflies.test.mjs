// 随机萤火虫验证独立漂浮、帧率一致、循环边界及低动态模式。
import test from 'node:test';
import assert from 'node:assert/strict';
import { FireflyField, fireflyOpacity, SOLITARY_FIREFLIES } from '../src/world/fireflies.js';
import { WORLD, worldDistance, visibleBodies } from '../src/world/coordinates.js';

// 使用固定展示时钟推进漂浮，不依赖真实时间或战斗随机源。
function run(field, seconds, fps = 60) {
  field.advance(0);
  for (let frame = 1; frame <= seconds * fps; frame++) field.advance(frame / fps);
  return field;
}

test('森林与湖畔合计72只独立散点，重复采样不改变数量或坐标', () => {
  const field = new FireflyField();
  assert.equal(field.points.length, SOLITARY_FIREFLIES);
  assert.equal(field.points.length, 72);
  assert.deepEqual(field.points, new FireflyField().points);
  assert.notDeepEqual(field.points, new FireflyField(1).points);
  const initial = structuredClone(field.points);
  field.advance(0);
  field.advance(0);
  assert.deepEqual(field.points, initial);
  assert.equal(new Set(field.points.map((p) => p.phase)).size, 72);
});

test('30与120帧下漂浮一致，修改其他散点不会影响当前个体', () => {
  const slow = run(new FireflyField(), 20, 30),
    fast = run(new FireflyField(), 20, 120);
  for (let i = 0; i < slow.points.length; i++) {
    assert.ok(worldDistance(slow.points[i], fast.points[i]) < 1e-7);
    assert.ok(Number.isFinite(slow.points[i].x + slow.points[i].y));
  }
  const isolated = new FireflyField();
  isolated.points = [isolated.points[0]];
  run(isolated, 20);
  assert.deepEqual(isolated.points[0], slow.points[0]);
});

test('漂浮跨越地图边界，镜像显示不新增或重新随机实体', () => {
  const field = new FireflyField(),
    p = field.points[0];
  p.homeX = WORLD.width - 1;
  p.phase = 0;
  p.pace = 0.3;
  run(field, 1);
  assert.ok(p.x > 0 && p.x < 10);
  const count = field.points.length,
    view = { x: 1700, y: 0, w: 400, h: 1400 };
  const one = visibleBodies(field.points, view, 14),
    two = visibleBodies(field.points, { ...view, x: view.x + WORLD.width }, 14);
  assert.equal(one.length, two.length);
  assert.equal(field.points.length, count);
  one.forEach((p, i) => assert.ok(Math.abs(two[i].x - p.x - WORLD.width) < 1e-8));
});

test('低动态和白天可以冻结，恢复不突进，时钟重置可安全重开', () => {
  const field = run(new FireflyField(), 2),
    before = structuredClone(field.points);
  field.advance(200, true);
  assert.deepEqual(field.points, before);
  field.advance(200.0167);
  assert.ok(worldDistance(field.points[0], before[0]) < 1);
  const time = field.time;
  field.advance(900);
  assert.ok(field.time - time <= 0.201);
  field.advance(0);
  assert.deepEqual(field.points, new FireflyField().points);
});

test('白天隐藏、黄昏微亮、夜晚增强、雨天减弱，光照中间态连续', () => {
  const opacity = (night, dusk = 0, rain = 0) => fireflyOpacity({ night, dusk, rain });
  assert.equal(opacity(0), 0);
  assert.equal(opacity(0, 1), 0.25);
  assert.equal(opacity(1), 0.9);
  assert.ok(opacity(1, 0, 1) < opacity(1));
  assert.ok(opacity(0.5) > 0 && opacity(0.5) < opacity(1));
});
