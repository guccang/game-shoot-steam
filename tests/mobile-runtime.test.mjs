// 手机持续负载回归：高刷调度、后台恢复、寻敌等价性与空场景工作量。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameLoop } from '../src/platform/frame-loop.js';
import { Game } from '../src/game.js';
import { attackTargetDistance, attackTargetKnown, attackTargetVisible } from '../src/combat/perception.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';
import { stepBodies } from '../src/physics/motion.js';

// 人工刷新时钟无需真实等待，回调队列按浏览器一次性 RAF 语义消费。
function clock(onFrame) {
  let time = 0, id = 0;
  const pending = new Map();
  const host = { document: { hidden: false }, performance: { now: () => time },
    requestAnimationFrame: callback => { pending.set(++id, callback); return id; },
    cancelAnimationFrame: key => pending.delete(key) };
  const loop = createFrameLoop({ host, onFrame });
  // 单次刷新只消费此前已安排的回调，新回调等待下次刷新。
  function tick(now) { time = now; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(now)); }
  return { host, loop, tick, pending };
}

test('60/90/120/144Hz 连续半小时最多每秒60次更新且不丢模拟时间', () => {
  for (const hz of [60, 90, 120, 144]) {
    let frames = 0, elapsed = 0;
    const c = clock(dt => { frames++; elapsed += dt; }); c.loop.start(); c.loop.start();
    for (let i = 1; i <= hz * 1800; i++) c.tick(i * 1000 / hz);
    assert.equal(frames, 60 * 1800, `刷新率 ${hz}`);
    assert.ok(Math.abs(elapsed - 1800) < 1e-6, `时钟 ${hz}: ${elapsed}`);
    assert.equal(c.pending.size, 1); c.loop.dispose(); assert.equal(c.pending.size, 0);
  }
});

test('后台不执行重工作，恢复及卡顿不补帧，销毁重启只有一条循环', () => {
  const steps = [], c = clock(dt => steps.push(dt)); c.loop.start();
  c.tick(17); c.host.document.hidden = true; c.tick(1000); c.tick(2000);
  assert.equal(steps.length, 1);
  c.host.document.hidden = false; c.tick(2017);
  assert.ok(steps.at(-1) < 0.018);
  c.tick(5000); assert.equal(steps.at(-1), 0.05); assert.equal(steps.length, 3);
  c.tick(5001); assert.equal(steps.length, 3);
  c.loop.dispose(); c.tick(6000); c.loop.start(); c.tick(6017);
  assert.equal(steps.length, 4); c.loop.dispose();
});

// 保留修改前的排序实现作为独立参照，检查同距、敌人优先和边界条件。
function reference(game) {
  const weapon = game.weapon();
  const enemies = [...game.enemies, ...(game.boss ? [game.boss] : [])].filter(
    e => e.hp > 0 && attackTargetKnown(game, e) && worldDistance(e, game.player) < weapon.range + e.radius);
  const candidates = enemies.length ? enemies : weapon.targetTrees === false || game.fireActive ||
    ['football', 'race'].includes(game.realm?.mode) ? [] : game.trees.filter(
      t => t.hp > 0 && attackTargetVisible(game, t) && worldDistance(t, game.player) < weapon.range);
  return candidates.sort((a, b) => worldDistance(a, game.player) - worldDistance(b, game.player))[0] || null;
}

test('单遍寻敌与原实现选择同一对象：死亡、同距、镜头、记忆、树木与循环边界', () => {
  let seed = 4567;
  // 固定种子使对象位置与验证次序可重复。
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  for (let round = 0; round < 250; round++) {
    const player = { x: round % 2 ? WORLD.width - 20 : 1500, y: 1200 };
    // 同距点成对出现，以对象身份检查稳定的先后次序。
    const objects = Array.from({ length: 100 }, (_, id) => ({ id, type: id < 30 ? 'enemy' : 'tree',
      x: player.x + Math.round(random() * 12 - 6) * 55, y: player.y + Math.round(random() * 12 - 6) * 55,
      radius: 17, hp: random() < 0.2 ? 0 : 100 }));
    const weapon = { range: 260 + round % 3 * 200, targetTrees: round % 7 !== 0 };
    const game = { player, trees: objects.slice(30), enemies: round % 3 ? objects.slice(0, 29) : [],
      boss: round % 5 ? null : objects[29], viewport: { width: 390, height: 844 },
      arrivalView: { left: -195, right: 195, top: -422, bottom: 422, width: 390, height: 844 },
      weapon: () => weapon, combatSight: new WeakMap(), fireActive: round % 11 === 0,
      realm: round % 13 === 0 ? { mode: 'race' } : null };
    for (const e of game.enemies) if (e.id % 2) game.combatSight.set(e, e.id);
    assert.equal(Game.prototype.findAttackTarget.call(game), reference(game), `场景 ${round}`);
  }
});

test('全图远树不进入视野投影，空物理帧不读取树集合', () => {
  let views = 0;
  const game = { player: { x: 0, y: 0 }, enemies: [], boss: null,
    trees: Array.from({ length: 5000 }, (_, id) => ({ id, x: 1000 + id % 3000, y: 1000, hp: 10 })),
    weapon: () => ({ range: 260 }), get viewport() { views++; return { width: 390, height: 844 }; } };
  assert.equal(Game.prototype.findAttackTarget.call(game), null); assert.equal(views, 0);
  const trees = new Proxy([], { get() { throw Error('空物理帧不应扫描树林'); } });
  stepBodies([], 1 / 60, WORLD, undefined, trees);
  stepBodies([{ x: 100, y: 100 }], 0, WORLD, undefined, trees);
});

test('射程粗筛保留精确边缘、半幅折返、负坐标与多圈镜像结果', () => {
  const player = { x: 1500.123456, y: -1200.987654 }, game = { player };
  for (const limit of [0, 17, 260, 900, 6000])
    for (const turn of [-3, -1, 0, 1, 3])
      for (const dx of [-WORLD.width / 2, -limit - 1e-8, -limit, -limit + 1e-8, 0, limit - 1e-8, limit, limit + 1e-8, WORLD.width / 2])
        for (const dy of [0, limit / 2, limit + 2, WORLD.height / 2]) {
          const target = { x: player.x + dx + turn * WORLD.width, y: player.y + dy - turn * WORLD.height };
          assert.equal(attackTargetDistance(game, target, limit) < limit, worldDistance(target, player) < limit);
        }
});
