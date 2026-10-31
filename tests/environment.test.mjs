// 移植 game-slg 环境回归，补充滚动地图水域与中断过渡的检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_CYCLE_DURATION, normalizeEnvironment, restartDayCycle, advanceEnvironment, EnvironmentTransition, WEATHER_FADE_DURATION } from '../src/world/environment.js';
import { riverPoint, isWaterScenery, WATERFALL, BRIDGE } from '../src/world/river-geometry.js';
import { Game, freshProgress } from '../src/game.js';

test('放慢昼夜周期：2分钟白昼、1分钟黄昏、2分钟夜晚，离线按锚点定位', () => {
  const start = 1000000, state = normalizeEnvironment({}, start);
  assert.equal(DAY_CYCLE_DURATION, 300000);
  for (const [elapsed, phase] of [[119999, 'day'], [120000, 'dusk'], [180000, 'night'], [300000, 'day'], [300000 * 100 + 180000, 'night']]) {
    advanceEnvironment(state, start + elapsed, () => 0); assert.equal(state.time, phase);
  }
});
test('手动选择后从该时段续播，自动昼夜和天气开关互不干扰', () => {
  const state = normalizeEnvironment({ time: 'night', weather: 'rain', autoWeather: false }, 100000);
  advanceEnvironment(state, 101000); assert.equal(state.time, 'night'); assert.equal(state.weather, 'rain');
  state.time = 'dusk'; restartDayCycle(state, 102000); advanceEnvironment(state, 162000); assert.equal(state.time, 'night');
  state.autoTime = false; const frozen = structuredClone(state); advanceEnvironment(state, 1000000); assert.equal(state.time, frozen.time); assert.equal(state.weather, frozen.weather); // 四季时钟独立继续前进。
});
test('每120秒选择不同天气，刷新保留时钟锚点和手动开关', () => {
  for (const [random, weather] of [[0, 'cloud'], [.2, 'rain'], [.7, 'snow'], [.99, 'snow']]) {
    const state = normalizeEnvironment({}, 100000); advanceEnvironment(state, 220000, () => random); assert.equal(state.weather, weather);
    const restored = normalizeEnvironment(JSON.parse(JSON.stringify(state)), 221000);
    assert.equal(restored.dayCycleAt, 100000); assert.equal(restored.weatherAt, 220000);
  }
});
test('旧存档、非法字段与系统时间回拨均可恢复', () => {
  const state = normalizeEnvironment({ time: 'invalid', weather: 'invalid', autoTime: 'bad', weatherAt: Infinity }, 100000);
  assert.equal(state.time, 'day'); assert.equal(state.weather, 'sun'); assert.equal(state.autoTime, true);
  advanceEnvironment(state, 50000); assert.equal(state.dayCycleAt, 50000); assert.equal(state.weatherAt, 50000);
  const progress = freshProgress(); const game = new Game(progress); assert.deepEqual(game.progress, progress);
});
test('十五秒过渡存在中间态，快速反转连续，切换天气不重启昼夜', () => {
  const duration = WEATHER_FADE_DURATION;
  assert.equal(duration, 15000);
  const visual = new EnvironmentTransition({ time: 'day', weather: 'sun' }, 0);
  visual.set({ time: 'night', weather: 'sun' }, 0);
  const middle = visual.sample(duration / 2).night; assert.ok(middle > .2 && middle < 1);
  visual.set({ time: 'night', weather: 'rain' }, duration / 2);
  assert.equal(visual.sample(duration / 2).night, middle);
  assert.ok(visual.sample(duration - 1).night < 1);
  assert.equal(visual.sample(duration).night, 1);
  assert.ok(visual.sample(duration).rain < 1);
  assert.equal(visual.sample(duration * 1.5).rain, 1);
  visual.set({ time: 'day', weather: 'rain' }, duration);
  assert.equal(visual.sample(duration).night, 1); assert.equal(visual.sample(duration * 2).night, 0);
  visual.set({ time: 'night', weather: 'rain' }, duration * 2);
  assert.equal(visual.sample(duration * 2, true).night, 1);
});
test('河道几何连接瀑布，树木生成与河岸共享排除区域', () => {
  assert.deepEqual(riverPoint(.25), { x: WATERFALL.x, y: WATERFALL.y });
  assert.deepEqual(riverPoint(.5), { x: WATERFALL.x, y: WATERFALL.y + WATERFALL.height });
  assert.equal(isWaterScenery(WATERFALL.x, WATERFALL.y + 50), true);
  assert.equal(isWaterScenery(900, 700), false);
  const game = new Game(freshProgress(), () => .5);
  assert.ok(game.trees.every(tree => !isWaterScenery(tree.x, tree.y)));
  assert.ok(BRIDGE.x < riverPoint(.625).x + 80);
});
