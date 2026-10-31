// 正面视频主体的动作时钟、资源回退、真实图集以及原握枪机制回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Game, freshProgress } from '../src/game.js';
import { createCatMotion, updateCatMotion } from '../src/core/cat-motion.js';
import { catFrame, CatSpriteAtlas, validateCatManifest } from '../src/rendering/cat-animation.js';
import { muzzlePosition } from '../src/combat/recoil.js';

// 使用空战场避免随机怪物推进打断待机/移动验收。
function arena() {
  const g = new Game(freshProgress(), () => 0.5); g.start();
  g.trees = []; g.enemies = []; g.spawnTimer = g.attackTimer = 999; return g;
}

test('正面动作在 30/120 FPS 下同速过渡，起停柔和且不依赖朝向', () => {
  const states = [];
  for (const fps of [30, 120]) {
    const state = createCatMotion();
    for (let i = 0; i < fps / 2; i++) updateCatMotion(state, 1 / fps, 150, true);
    assert.equal(state.moveWeight, 1);
    for (let i = 0; i < fps / 10; i++) updateCatMotion(state, 1 / fps, 0, false);
    assert.ok(state.moveWeight > 0.1 && state.moveWeight < 0.3); states.push(state);
  }
  for (const key of Object.keys(states[0])) assert.ok(Math.abs(states[0][key] - states[1][key]) < 0.001);
});

test('实际位移驱动迈步，撞树和驾驶回待机，暂停与死亡冻结动画', () => {
  const g = arena();
  for (let i = 0; i < 20; i++) g.update(0.05, { x: 1, y: 0 });
  assert.equal(g.player.bodyAnimation.moveWeight, 1);
  const p = g.player; g.trees = [{ x: p.x + 35, y: p.y, radius: 22, hp: 99, sway: 0, flash: 0 }];
  for (let i = 0; i < 20; i++) g.update(0.05, { x: 1, y: 0 });
  assert.equal(p.bodyAnimation.moveWeight, 0);
  g.trees = []; g.summonVehicle();
  for (let i = 0; i < 20; i++) g.update(0.05, { x: 1, y: 0 });
  assert.equal(p.bodyAnimation.moveWeight, 0); assert.ok(p.bodyAnimation.idleTime > 2);
  for (const state of ['paused', 'dead']) {
    g.state = state; const before = structuredClone(p.bodyAnimation); g.update(0.05, { x: 1, y: 0 });
    assert.deepEqual(p.bodyAnimation, before);
  }
});

test('主体动画不改变八方向实际枪口与射击后坐', () => {
  for (let direction = 0; direction < 8; direction++) {
    const g = arena(); g.player.angle = direction * Math.PI / 4;
    const before = muzzlePosition(g.player, 0);
    updateCatMotion(g.player.bodyAnimation, 0.05, 150, true);
    assert.deepEqual(muzzlePosition(g.player, 0), before);
    g.spawnEnemy(g.player.angle, 150); g.enemies[0].hp = g.enemies[0].maxHp = 10000;
    assert.ok(g.attack()); assert.ok(g.player.recoil.kick > 0);
  }
});

test('动作按各自 FPS 循环，减少动态固定首帧', () => {
  const action = { fps: 24, frames: [4, 7, 8, 9] };
  assert.equal(catFrame(action, 0), 4); assert.equal(catFrame(action, 1 / 24), 7);
  assert.equal(catFrame(action, 4 / 24), 4); assert.equal(catFrame(action, 100, true), 4);
});

test('资源失败只请求一次且回退，损坏清单和图集引用拒绝加载', async () => {
  let count = 0;
  const atlas = new CatSpriteAtlas(async () => { count++; return { ok: false }; });
  assert.equal(await atlas.load(), false); assert.equal(await atlas.load(), false);
  assert.equal(count, 1); assert.equal(atlas.status, 'failed');
  assert.equal(atlas.draw(null, 0, createCatMotion(), {}), false);
  assert.throws(() => validateCatManifest({ version: 1, facing: 'eight-way', heroes: [] }));
});

test('起停衔接始终绘制一个主体，重复绘制不会推进动作或叠出半透明重影', async () => {
  const atlas = new CatSpriteAtlas();
  atlas.manifest = validateCatManifest(JSON.parse(await readFile(new URL('../assets/cat-front/animations.json', import.meta.url), 'utf8')));
  atlas.status = 'ready'; atlas.images = [{}, {}];
  // 本用例隔离动作时钟；真实画布的品种几何与像素在浏览器验收中覆盖。
  atlas.coats.get = (image, manifest, frame, breed) => `${breed.id}:${frame}`;
  const state = createCatMotion(); let calls = [];
  const c = { save() {}, restore() {}, translate() {}, drawImage(...args) { calls.push(args); } };
  for (const walking of [false, true, false, true]) for (let step = 0; step < 12; step++) {
    updateCatMotion(state, 1 / 24, walking ? 150 : 0, walking);
    const before = structuredClone(state);
    for (const hero of [0, 1, 2, 3, 4, 5]) {
      calls = []; atlas.draw(c, hero, state, { bodyX: 0, bodyY: 0 });
      assert.equal(calls.length, 1); const first = calls[0];
      calls = []; atlas.draw(c, hero, state, { bodyX: 0, bodyY: 0 });
      assert.equal(calls.length, 1); assert.deepEqual(calls[0], first);
    }
    assert.deepEqual(state, before);
  }
});

test('真实 PNG 图集与原视频哈希对应，只有正面待机/移动且原始源时间可追溯', async () => {
  const root = new URL('../assets/cat-front/', import.meta.url);
  const data = validateCatManifest(JSON.parse(await readFile(new URL('animations.json', root), 'utf8')));
  let bytes = 0;
  for (const h of data.heroes) {
    assert.deepEqual(Object.keys(h.actions), ['idle', 'move']);
    const png = await readFile(new URL(h.atlas, root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(width, h.columns * h.frameSize); assert.equal(height, Math.ceil(h.frameCount / h.columns) * h.frameSize);
    bytes += width * height * 4;
    const video = await readFile(new URL(h.source.file, root));
    assert.equal(createHash('sha256').update(video).digest('hex'), h.source.sha256);
    for (const action of Object.values(h.actions)) {
      assert.equal(action.fps, 24); assert.ok(action.frames.length >= 16);
      for (const index of action.frames) {
        assert.equal(h.frames[index].id, index);
        assert.ok(Math.abs(h.frames[index].sourceTime - h.frames[index].sourceFrame / h.source.fps) < 1e-7);
      }
    }
    const invalid = structuredClone(data); invalid.heroes[0].actions.idle.frames[0] = 99999;
    assert.throws(() => validateCatManifest(invalid));
  }
  assert.ok(bytes < 20 * 1024 * 1024, '主体图集必须保持手机内存预算');
});
