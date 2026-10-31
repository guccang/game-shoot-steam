import { WORLD } from '../src/world/coordinates.js';
// 出击飞控回归：稳定编队、远端驻点、目标更新、回收、视口安全与真实发射来源。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import {
  updateFunnel,
  resetFunnelFormation,
  funnelMuzzle,
} from '../src/combat/funnel.js';
import { advanceReload } from '../src/combat/magazine.js';
import { nearest } from '../src/world/coordinates.js';
import { funnelFlightBounds } from '../src/combat/funnel-movement.js';

// 静止靶场只推进飞控和共享能源，不让敌人 AI 影响射位检查。
function arena(withTarget = true) {
  const p = freshProgress();
  p.weapon = 12;
  p.weapons[12] = 1;
  const g = new Game(p, () => 0.5);
  g.start();
  g.enemies = [];
  g.trees = [];
  g.boss = null;
  g.setViewport(390, 844);
  if (withTarget)
    for (let i = 0; i < 3; i++)
      g.enemies.push({
        id: i + 1,
        type: 'enemy',
        x: g.player.x + (i - 1) * 150,
        y: g.player.y - 310,
        hp: 1e8,
        maxHp: 1e8,
        radius: 17,
      });
  return g;
}

// 正式战斗控制器与装填器共用时钟，保留在途弹记录以验证炮口。
function tick(g, seconds, dt = 1 / 120) {
  while (seconds > 1e-8) {
    const h = Math.min(dt, seconds);
    advanceReload(g.magazines[12], g.weapon(), h);
    updateFunnel(g, h);
    seconds -= h;
  }
}

// 同时验证锚点矩形、活动半径与有上限的运动轨迹。
function assertSafe(g) {
  const b = funnelFlightBounds(g.viewport);
  for (const n of g.funnel.nodes) {
    assert.ok(
      n.x >= b.minX - 0.001 &&
        n.x <= b.maxX + 0.001 &&
        n.y >= b.minY - 0.001 &&
        n.y <= b.maxY + 0.001,
    );
    assert.ok(Math.hypot(n.x, n.y) <= 270.001);
    assert.ok(n.flight.trail.length <= 9);
  }
}

test('无目标持续环绕；发现目标后错峰离队，三炮飞离角色到外侧驻点', () => {
  const g = arena(false);
  tick(g, 4);
  for (const n of g.funnel.nodes) {
    assert.equal(n.flight.mode, 'escort');
    assert.ok(Math.hypot(n.x, n.y + 20) > 60);
  }
  const before = g.funnel.nodes.map((n) => [n.x, n.y]);
  tick(g, 4);
  for (const [i, n] of g.funnel.nodes.entries())
    assert.ok(Math.hypot(n.x - before[i][0], n.y - before[i][1]) > 100);
  g.enemies = arena().enemies;
  tick(g, 0.14);
  assert.equal(g.funnel.nodes[0].flight.mode, 'outbound');
  assert.equal(g.funnel.nodes[2].flight.mode, 'launch');
  tick(g, 1.4);
  // 新射位保留远程间距，不再要求炮体冲到离角色 175 单位之外。
  assert.ok(g.funnel.nodes.every((n) => Math.hypot(n.x, n.y) > 80));
  assert.ok(g.funnel.nodes.every((n) => {
    const t = g.enemies.find((e) => e.id === n.targetId);
    return Math.hypot(g.player.x + n.x - t.x, g.player.y + n.y - t.y + 8) > 175;
  }));
  assert.ok(g.funnel.nodes.every((n) => n.flight.mode === 'attack'));
  assertSafe(g);
});

test('驻点后不随射击来回横跳，角色小幅移动也不会牵着炮体回头顶', () => {
  const g = arena();
  // 将驻点放在活动边界内，单独验证驻留，不触发合理的越界回收。
  for (const e of g.enemies) e.y += 70;
  tick(g, 2);
  const points = g.funnel.nodes.map((n) => ({ x: g.player.x + n.x, y: g.player.y + n.y }));
  tick(g, 3);
  for (const [i, n] of g.funnel.nodes.entries())
    assert.ok(Math.hypot(g.player.x + n.x - points[i].x, g.player.y + n.y - points[i].y) < 2);
  for (let k = 0; k < 60; k++) {
    g.player.x += 0.3;
    tick(g, 1 / 120);
  }
  for (const [i, n] of g.funnel.nodes.entries())
    assert.ok(Math.hypot(g.player.x + n.x - points[i].x, g.player.y + n.y - points[i].y) < 2);
  assert.ok(g.funnel.nodes.every((n) => n.flight.thrust < 0.02));
});

test('有效目标不被新近邻抢锁；目标明显移动才更新射位，死亡立即转场', () => {
  const g = arena();
  tick(g, 2);
  const ids = g.funnel.nodes.map((n) => n.targetId),
    stations = g.funnel.nodes.map((n) => ({ ...n.flight.station }));
  g.enemies.push({ ...g.enemies[0], id: 99, x: g.player.x + 90, y: g.player.y });
  tick(g, 0.1);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    ids,
  );
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.flight.station),
    stations,
  );
  const n = g.funnel.nodes[0],
    target = g.enemies.find((e) => e.id === n.targetId);
  target.x += 90;
  tick(g, 0.05);
  assert.notDeepEqual(n.flight.station, stations[0]);
  target.hp = 0;
  tick(g, 0.01);
  assert.equal(n.targetId, 99);
  assert.equal(n.flight.delay, 0);
  assert.equal(n.flight.mode, 'outbound');
});

test('空场回到环绕编队，充能回泊位才推进各炮补给，慢速归队后尾迹消失', () => {
  for (const charging of [false, true]) {
    const g = arena();
    if(charging){g.progress.weapons[9]=1;g.progress.funnelLoadout=[9,9,9];}
    tick(g, 2);
    if (charging)
      g.magazines[12].modules.forEach((m) => Object.assign(m, { ammo: 0, remaining: 3.2 }));
    else g.enemies = [];
    tick(g, 0.05);
    assert.ok(g.funnel.nodes.every((n) => n.flight.mode === 'return'));
    tick(g, 1.8);
    assert.ok(g.funnel.nodes.every((n) => n.flight.mode === (charging ? 'dock' : 'escort')));
    assert.ok(
      g.funnel.nodes.every((n) => Math.hypot(n.x, n.y) <= (charging ? 80.01 : 105) && n.flight.trail.length === 0),
    );
    if (charging)
      assert.ok(g.magazines[12].modules.every((m) => m.remaining > 1.35 && m.remaining < 3.2));
  }
});

// 跨完整一圈验证真实位移、持续运动、炮体间距与窄屏安全，不能靠静态锚点通过。
test('待机三炮完整绕行且不穿过角色，30/120 帧和窄屏保持一致编队', () => {
  for (const width of [320, 390, 580]) {
    const results = [];
    for (const dt of [1 / 30, 1 / 120]) {
      const g = arena(false);
      g.setViewport(width, 568);
      tick(g, 3, dt);
      const initial = g.funnel.nodes.map(n => ({ x: n.x, y: n.y }));
      const quadrants = g.funnel.nodes.map(() => new Set());
      for (let k = 0; k < Math.round(10 / dt); k++) {
        const prior = g.funnel.nodes.map(n => ({ x: n.x, y: n.y }));
        tick(g, dt, dt);
        assertSafe(g);
        for (const [i, n] of g.funnel.nodes.entries()) {
          quadrants[i].add(`${Math.sign(n.x)},${Math.sign(n.y + 20)}`);
          assert.ok(Math.hypot(n.x - prior[i].x, n.y - prior[i].y) > 20 * dt);
          assert.ok(Math.hypot(n.x, n.y + 22) > 60, '留出角色身体空间');
          for (const other of g.funnel.nodes.slice(i + 1))
            assert.ok(Math.hypot(n.x - other.x, n.y - other.y) > 100, '编队不拥挤');
        }
      }
      for (const [i, n] of g.funnel.nodes.entries()) {
        assert.equal(quadrants[i].size, 4, '每门炮覆盖角色四周');
        assert.ok(Math.hypot(n.x - initial[i].x, n.y - initial[i].y) < 1);
      }
      results.push(g.funnel.nodes);
    }
    for (let i = 0; i < 3; i++)
      assert.ok(Math.hypot(results[0][i].x - results[1][i].x, results[0][i].y - results[1][i].y) < 2);
  }
});

// 单炮补给期间其余两炮继续巡航；完成补给后回到共享相位，不重置整队位置。
test('待机单炮返航不打断其他炮环绕，暂停冻结相位，低动态保留静态编队', () => {
  const g = arena(false);
  g.progress.weapons[9]=1;g.progress.funnelLoadout=[9,12,12];
  tick(g, 3);
  const n = g.funnel.nodes[0];
  Object.assign(n.magazine, { ammo: 0, remaining: 3.2 });
  tick(g, 1.5);
  assert.equal(n.flight.mode, 'dock');
  const before = g.funnel.nodes.slice(1).map(n => ({ x: n.x, y: n.y }));
  tick(g, 1);
  assert.equal(n.flight.mode, 'dock');
  for (const [i, other] of g.funnel.nodes.slice(1).entries())
    assert.ok(Math.hypot(other.x - before[i].x, other.y - before[i].y) > 25);
  tick(g, 4);
  assert.ok(g.funnel.nodes.every(n => n.flight.mode === 'escort'));
  const snapshot = JSON.stringify(g.funnel);
  g.pause(); g.update(0.05);
  assert.equal(JSON.stringify(g.funnel), snapshot);
  g.pause(); g.reducedMotion = true;
  tick(g, 0.1);
  const anchors = g.funnel.nodes.map(n => [n.x, n.y]);
  const phase = g.funnel.orbitPhase;
  tick(g, 2);
  assert.deepEqual(g.funnel.nodes.map(n => [n.x, n.y]), anchors);
  assert.equal(g.funnel.orbitPhase, phase);
});

test('三种竖屏、连续走位、地图换边和暂停缩屏时始终可见', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [580, 928],
  ]) {
    const g = arena();
    g.setViewport(width, height);
    for (let k = 0; k < 1500; k++) {
      g.player.x = (g.player.x + 1.3) % WORLD.width;
      g.player.y += Math.sin(k / 90) * 0.6;
      tick(g, 1 / 120);
      assertSafe(g);
    }
    g.setViewport(320, 568);
    assertSafe(g);
  }
  const g = arena(false);
  g.player.x = WORLD.width - 1;
  g.enemies = [{ id: 1, type: 'enemy', x: 170, y: g.player.y, hp: 1e8, radius: 17 }];
  tick(g, 1);
  const before = g.funnel.nodes.map((n) => ({ x: g.player.x + n.x, y: g.player.y + n.y }));
  g.player.x = 1;
  tick(g, 1 / 120);
  for (const [i, n] of g.funnel.nodes.entries()) {
    const point = nearest({ x: g.player.x + n.x, y: g.player.y + n.y }, before[i]);
    assert.ok(Math.hypot(point.x - before[i].x, point.y - before[i].y) < 8);
  }
  const state = JSON.stringify(g.funnel);
  g.pause();
  g.update(0.05);
  assert.equal(JSON.stringify(g.funnel), state);
  g.setViewport(320, 568);
  assertSafe(g);
});

test('弹丸从离队炮口发出；低动态回退固定阵列，切枪只重置飞控', () => {
  const g = arena();
  let count = 0,
    muzzles = [];
  g.random = () => {
    muzzles.push(...g.funnel.nodes.map((n) => funnelMuzzle(g.player, n)));
    return 0.5;
  };
  for (let k = 0; k < 420; k++) {
    muzzles = [];
    updateFunnel(g, 1 / 120);
    for (const b of g.projectiles.slice(count))
      assert.ok(muzzles.some((m) => Math.hypot(m.x - b.originX, m.y - b.originY) < 1e-6));
    count = g.projectiles.length;
  }
  assert.equal(count, 12);
  assert.equal(
    g.magazines[12].modules.reduce((sum, m) => sum + m.ammo, 0),
    30,
  );
  assert.ok(
    g.projectiles.some((b) => Math.hypot(b.originX - g.player.x, b.originY - g.player.y) > 90),
  );
  g.reducedMotion = true;
  tick(g, 0.01);
  const anchors = g.funnel.nodes.map((n) => [n.x, n.y]);
  tick(g, 2);
  assert.deepEqual(
    g.funnel.nodes.map((n) => [n.x, n.y]),
    anchors,
  );
  assert.ok(g.funnel.nodes.every((n) => n.flight.thrust === 0 && n.flight.trail.length === 0));
  const cooldown = g.funnel.nodes.map((n) => n.cooldown),
    ammo = g.magazines[12].modules.reduce((sum, m) => sum + m.ammo, 0);
  resetFunnelFormation(g.funnel);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.cooldown),
    cooldown,
  );
  assert.equal(
    g.magazines[12].modules.reduce((sum, m) => sum + m.ammo, 0),
    ammo,
  );
});

test('30 与 120 帧下出击到达同一驻点，长时间驻留不会抖动', () => {
  const results = [];
  for (const dt of [1 / 30, 1 / 120]) {
    const g = arena();
    tick(g, 4, dt);
    results.push(g.funnel.nodes.map((n) => [n.x, n.y]));
  }
  for (let i = 0; i < 3; i++)
    assert.ok(
      Math.hypot(results[0][i][0] - results[1][i][0], results[0][i][1] - results[1][i][1]) < 1,
    );
});

// 同方向目标拥挤时，射位规划依旧优先给每门炮分配清晰的空间。
test('三炮对同一 Boss 集火仍分散驻位，不挤成一团持续互相推挤', () => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [580, 928],
  ]) {
    const g = arena(false);
    g.setViewport(width, height);
    g.boss = {
      id: 90,
      type: 'boss',
      x: g.player.x + 110,
      y: g.player.y - 120,
      hp: 1e8,
      radius: 40,
    };
    tick(g, 2.2);
    for (const [i, n] of g.funnel.nodes.entries()) {
      assert.equal(n.flight.mode, 'attack');
      for (const other of g.funnel.nodes.slice(i + 1))
        assert.ok(Math.hypot(n.x - other.x, n.y - other.y) > 58);
    }
  }
});
