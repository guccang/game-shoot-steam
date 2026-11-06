import { equipmentRecipe } from '../src/progression/equipment-goals.js';
// 新模块的复用契约：无浏览器规则、可替换存储及可卸载的事件与帧循环。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game as PublicGame, freshProgress } from '../src/game.js';
import { Game } from '../src/core/game.js';
import { Renderer as PublicRenderer } from '../src/render.js';
import { Renderer } from '../src/rendering/renderer.js';
import { createApplication } from '../src/app/create-app.js';
import { transactProgress } from '../src/progression/transactions.js';
import { createSaveStore, STORAGE_KEYS } from '../src/platform/storage.js';
import { createEventScope } from '../src/platform/events.js';
import { createFrameLoop } from '../src/platform/frame-loop.js';

test('公开门面保持同一类身份，规则和应用模块可在没有 DOM 的 Node 中导入', () => {
  assert.equal(PublicGame, Game);
  assert.equal(PublicRenderer, Renderer);
  assert.equal(typeof createApplication, 'function');
  const p = freshProgress();
  p.materials.parts = equipmentRecipe('weapons',3).parts;
  p.coins = equipmentRecipe('weapons',3).coins;
  p.wood = equipmentRecipe('weapons',3).wood;
  p.bosses = 1;
  assert.ok(transactProgress(p, 'weapons', 3, 'buy'));
  assert.equal(p.weapon, 3);
  assert.equal(p.coins, 0);
  const before = structuredClone(p);
  assert.equal(transactProgress(p, 'weapons', 2, 'buy'), false);
  assert.deepEqual(p, before);
});

test('内存存储可替代 localStorage，新档校验、键名隔离与写入失败均不丢失原档', () => {
  const values = new Map();
  let blocked = false;
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => {
      if (blocked) throw Error('blocked');
      values.set(key, value);
    },
  };
  const store = createSaveStore(() => storage);
  assert.deepEqual(store.loadProgress(), freshProgress());
  const p = freshProgress();
  p.coins = 1234;
  assert.ok(store.saveProgress(p));
  store.saveEnvironment({ time: 'night', weather: 'rain', autoTime: false, autoWeather: false });
  assert.equal(store.loadEnvironment().time, 'night');
  assert.equal(store.loadProgress().coins, 1234);
  blocked = true;
  assert.equal(store.saveProgress(freshProgress()), false);
  assert.equal(store.available, false);
  assert.equal(JSON.parse(values.get(STORAGE_KEYS.progress)).coins, 1234);
  const denied = createSaveStore(() => {
    throw Error('denied');
  });
  assert.deepEqual(denied.loadProgress(), freshProgress());
  assert.equal(denied.saveProgress(p), false);
  blocked = false;
  values.set(STORAGE_KEYS.progress, 'invalid json');
  assert.deepEqual(store.loadProgress(), freshProgress());
});

// 操作偏好默认不暂停，显式选择独立于成长存档保存，损坏值不意外开启。
test('失焦暂停默认关闭，显式选择可持久化且独立于成长存档', () => {
  const values = new Map();
  const store = createSaveStore(() => ({
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }));
  assert.equal(store.loadGameplay().pauseOnBlur, false);
  store.saveGameplay({ pauseOnBlur: false });
  assert.equal(store.loadGameplay().pauseOnBlur, false);
  store.saveProgress(freshProgress());
  assert.equal(store.loadGameplay().pauseOnBlur, false);
  for (const raw of ['invalid json', 'null', '{}', '{"pauseOnBlur":"false"}', '{"pauseOnBlur":0}']) {
    values.set(STORAGE_KEYS.gameplay, raw);
    assert.equal(store.loadGameplay().pauseOnBlur, false);
  }
  store.saveGameplay({ pauseOnBlur: true });
  assert.equal(store.loadGameplay().pauseOnBlur, true);
  store.saveProgress(freshProgress());
  assert.equal(store.loadGameplay().pauseOnBlur, true);
  store.saveGameplay({ showFps: true });
  assert.deepEqual(store.loadGameplay(), { targetWood: true, pauseOnBlur: false, showFps: true });
});

test('事件与动画循环可重复销毁，重新挂载不会遗留监听或多条动画循环', () => {
  const target = new EventTarget(),
    scope = createEventScope();
  let calls = 0;
  scope.on(target, 'tick', () => calls++);
  target.dispatchEvent(new Event('tick'));
  scope.dispose();
  scope.dispose();
  target.dispatchEvent(new Event('tick'));
  assert.equal(calls, 1);
  const callbacks = new Map();
  let id = 0,
    lastDelta = 0;
  const host = {
    performance: { now: () => 0 },
    requestAnimationFrame: (fn) => {
      callbacks.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (key) => callbacks.delete(key),
  };
  const loop = createFrameLoop({
    host,
    onFrame: (dt) => {
      lastDelta = dt;
      loop.dispose();
    },
  });
  loop.start();
  loop.start();
  assert.equal(callbacks.size, 1);
  const [key, frame] = callbacks.entries().next().value;
  callbacks.delete(key);
  frame(1000);
  assert.equal(lastDelta, 0.05);
  assert.equal(callbacks.size, 0);
  loop.dispose();
});
