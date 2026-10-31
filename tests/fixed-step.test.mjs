// 分离时钟回归：验证真实调度、表现插值、生命周期及正式武器射速。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixedStep } from '../src/platform/fixed-step.js';
import { createFrameLoop } from '../src/platform/frame-loop.js';
import { createRenderInterpolation } from '../src/rendering/render-interpolation.js';
import { PerformanceMonitor } from '../src/platform/performance-monitor.js';
import { WORLD } from '../src/world/coordinates.js';
import { Game, freshProgress } from '../src/game.js';
import { updateMechanicalGun } from '../src/combat/mechanical-gun.js';
import { createRecoil } from '../src/combat/recoil.js';
import { WEAPONS } from '../src/config/weapons.js';
import { CombatFX } from '../src/combat/effects.js';

// 浮点时间断言允许纳秒级累积舍入，不放宽频率或步长条件。
function close(actual, expected, tolerance = 1e-6) { assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`); }
// 最小场景同时含动态身体、静态地图和独立连续动作状态。
function scene() { return { state: 'playing', mapId: 'forest', time: 0, previewTime: 0,
  player: { x: 100, y: 200, angle: 0, hp: 100, bodyAnimation: { idleTime: 0, moveTime: 0, moveWeight: 0 } },
  enemies: [], trees: [{ x: 400, y: 400 }], projectiles: [], realm: null }; }

test('半小时60/90/120/144Hz显示调度与25Hz逻辑独立，不吞模拟时间', () => {
  for (const hz of [60, 90, 120, 144]) {
    let time = 0, next, renders = 0, updates = 0, seconds = 0;
    const fixed = createFixedStep();
    const host = { performance: { now: () => time }, requestAnimationFrame: callback => { next = callback; return 1; }, cancelAnimationFrame() {} };
    const loop = createFrameLoop({ host, onFrame(dt, now, elapsed) {
      renders++; fixed.advance(elapsed, step => { assert.equal(step, .04); updates++; seconds += step; });
    } });
    loop.start();
    for (let i = 1; i <= hz * 1800; i++) { time = i * 1000 / hz; next(time); }
    assert.equal(renders, 108000); assert.equal(updates, 45000); close(seconds, 1800); loop.dispose();
  }
});

test('17FPS仍推进25Hz逻辑；长卡顿限制两步，恢复不继续追赶旧债', () => {
  const fixed = createFixedStep(); let count = 0;
  for (let i = 0; i < 170; i++) fixed.advance(1 / 17, () => count++);
  assert.equal(count, 250);
  const stalled = fixed.advance(4, () => count++);
  assert.equal(stalled.steps, 2); close(stalled.droppedSeconds, 3.92);
  assert.equal(fixed.advance(1 / 60, () => count++).steps, 0);
  fixed.reset(); assert.equal(fixed.advance(.039, () => count++).steps, 0);
});

test('后台没有RAF时显式重置时钟，恢复不补算后台时间', () => {
  let time = 0, next; const intervals = [];
  const host = { performance: { now: () => time }, requestAnimationFrame: fn => { next = fn; return 1; }, cancelAnimationFrame() {} };
  const loop = createFrameLoop({ host, onFrame: (dt, now, elapsed) => intervals.push(elapsed) });
  loop.start(); time = 17; next(time); time = 180000; loop.resetClock(); time += 17; next(time);
  close(intervals[1], .017); loop.dispose();
});

test('无逻辑更新的渲染帧仍有不同位置和动作时钟，权威状态不变', () => {
  const g = scene(), display = createRenderInterpolation(); display.beforeStep(g);
  g.time = .04; g.player.x += 8; g.player.bodyAnimation.moveTime = .04;
  const saved = JSON.stringify(g), a = display.sample(g, .25), body = a.player.bodyAnimation;
  assert.equal(a.player.x, 102); close(body.moveTime, .01); assert.equal(a.trees, g.trees);
  const b = display.sample(g, .75); assert.equal(b.player.x, 106); close(b.player.bodyAnimation.moveTime, .03);
  assert.equal(body, b.player.bodyAnimation); assert.notEqual(body, g.player.bodyAnimation); assert.equal(JSON.stringify(g), saved);
  display.beforeStep(g); g.player.x += 8;
  assert.equal(display.sample(g, .5).player.bodyAnimation, body);
});

test('暂停、切场景、传送、出生销毁及跨环面移动不会穿场或复活对象', () => {
  const g = scene(), display = createRenderInterpolation(); display.beforeStep(g);
  g.player.x += 8; g.state = 'paused'; assert.equal(display.sample(g, 0).player.x, 108);
  g.state = 'playing'; display.beforeStep(g); g.player.x += 1000; assert.equal(display.sample(g, .5).player.x, 1108);
  g.player.x = WORLD.width - 2; display.beforeStep(g); g.player.x = 2; close(display.sample(g, .5).player.x, 0);
  g.enemies = [{ x: 50, y: 100 }]; display.beforeStep(g); g.enemies = [{ x: 80, y: 90 }];
  const view = display.sample(g, .2); assert.equal(view.enemies.length, 1); assert.equal(view.enemies[0].x, 80);
  g.mapId = 'jiuzhaigou'; assert.equal(display.sample(g, 0).player.x, 2);
});

test('角度走最短弧、动作重置立即生效，寻敌查询仍使用权威身份', () => {
  const g = scene(), display = createRenderInterpolation(); g.player.angle = Math.PI - .1;
  g.findAttackTarget = function () { assert.equal(this, g); return this.player; };
  g.player.bodyAnimation.moveTime = 8; display.beforeStep(g);
  g.player.angle = -Math.PI + .1; g.player.bodyAnimation.moveTime = 0;
  const view = display.sample(g, .5); close(Math.abs(view.player.angle), Math.PI);
  assert.equal(view.player.bodyAnimation.moveTime, 0); assert.equal(view.findAttackTarget(), g.player);
});

test('载具伙伴、炮口后坐、生活NPC和特效随相同插值量更新', () => {
  const g = scene(), display = createRenderInterpolation();
  const companion = { x: 10, y: 20, recoil: { kick: 0 } };
  g.vehicle = { module: { companions: { nodes: [companion] } } };
  g.livingActors = new Map([['npc', { x: 30, y: 40 }]]); g.fx = { items: [{ x: 60, y: 70, age: 0 }] };
  display.beforeStep(g); companion.x += 8; companion.recoil.kick = 4;
  g.livingActors.get('npc').x += 4; g.fx.items[0].age = .04;
  const view = display.sample(g, .5);
  assert.equal(view.vehicle.module.companions.nodes[0].x, 14);
  assert.equal(view.vehicle.module.companions.nodes[0].recoil.kick, 2);
  assert.equal(view.livingActors.get('npc').x, 32); close(view.fx.items[0].age, .02);
});

test('诊断分别计算25Hz逻辑和60Hz绘制，不把插值帧当逻辑更新', () => {
  let now = 0; const monitor = new PerformanceMonitor(() => now), fixed = createFixedStep();
  for (let i = 0; i <= 120; i++) {
    now = i * 1000 / 60; const timing = fixed.advance(i ? 1 / 60 : 0, () => {});
    monitor.beginFrame(now, 'playing'); monitor.finishFrame({ logicSteps: timing.steps, logicHz: 25, renderTargetHz: 60 });
  }
  const summary = monitor.summary(); close(summary.fps, 60); close(summary.logicFps, 25);
  assert.equal(summary.logicTargetHz, 25); assert.equal(summary.renderTargetHz, 60);
});

// 隔离靶场保留正式Game更新和攻击计时，只替换发射载荷以测量到期次数。
function cadence(hz, interval) {
  const p = freshProgress(); p.arrival = null;
  const g = new Game(p, () => .5); g.state = 'playing'; g.trees = []; g.enemies = [];
  g.player.arena = { x: g.player.x, y: g.player.y, radius: 800 }; g.mainlineTalkDelay = 999; g.encounterTimer = 999;
  g.updateWaves = () => {}; g.updateWeaponAbility = () => {}; g.attackTimer = interval;
  const original = g.weapon(); g.weapon = () => ({ ...original, interval });
  let shots = 0; g.attack = () => { shots++; return true; };
  for (let i = 0; i < hz * 3; i++) g.update(1 / hz);
  return shots;
}
test('正式Game连射计时在25/60Hz一致，高速武器不受25发每秒上限限制', () => {
  for (const interval of [.075, .027]) {
    const low = cadence(25, interval), high = cadence(60, interval);
    assert.ok(Math.abs(low - high) <= 1, `${interval}: ${low}/${high}`);
    assert.ok(Math.abs(low - 3 / interval) <= 1);
  }
});

test('伙伴挂枪25/60Hz射速一致，无目标等待不积攒攻击', () => {
  // 正式弹药、后坐、弹道发射入口；靶子不移动且不在此测试中结算命中。
  function run(hz) {
    let shots = 0; const w = { ...WEAPONS[2], weaponIndex: 2, interval: .027, magazineSize: 999 };
    const gun = { weapon: w, angle: 0, recoil: createRecoil(), cooldown: .027,
      magazine: { ammo: 999, remaining: 0 }, cycle: {}, pulse: {} };
    const node = { x: 100, y: 100, gun }, target = { x: 230, y: 63, hp: 1e8, radius: 15, type: 'enemy' };
    const g = new Game(freshProgress(), () => .5, type => { if (type === 'shot') shots++; });
    g.trees=[];g.enemies=[];g.damage=()=>10;g.fx=new CombatFX(()=>.5);
    for(let i=0;i<hz*3;i++)updateMechanicalGun(g,node,target,1/hz);
    const before = shots;
    for(let i=0;i<hz*10;i++)updateMechanicalGun(g,node,null,1/hz);
    updateMechanicalGun(g,node,target,1/hz);
    assert.ok(shots-before <= 2);
    return before;
  }
  assert.ok(Math.abs(run(25)-run(60))<=1);
});
