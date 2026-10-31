// 浮游炮交战距离回归：原枪射程、安全圈、后撤滞回、窄屏与循环地图。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, WEAPONS } from '../src/game.js';
import { FUNNEL_OPEN, FUNNEL_FOLDED, FUNNEL_CHARGING } from '../src/combat/funnel.js';
import { updateFunnelMovement, funnelEngagement, funnelFlightBounds } from '../src/combat/funnel-movement.js';
import { nearest, WORLD } from '../src/world/coordinates.js';

const formations = { open: FUNNEL_OPEN, folded: FUNNEL_FOLDED, charging: FUNNEL_CHARGING };

// 单独推进正式飞控，不让补给和目标死亡掩盖射位稳定性。
function arena(weapons, distance = 300, type = 'enemy', width = 390) {
  const p = freshProgress();
  p.weapon = 12; p.weapons.fill(1);
  const g = new Game(p, () => 0.5);
  g.start(); g.setViewport(width, width === 320 ? 568 : 844);
  g.funnel.nodes.forEach((n, i) => { n.weapon = WEAPONS[weapons[i]]; });
  const target = { id: 1, type, x: g.player.x, y: g.player.y - distance + 8, radius: type === 'boss' ? 52 : 18 };
  return { g, target };
}

// 每个子步使用同一目标实体，覆盖连续逼近时的真实避让过程。
function tick(g, target, seconds) {
  for (let t = 0; t < seconds - 1e-8; t += 1 / 120)
    updateFunnelMovement(g, 1 / 120, [target, target, target], formations);
}

// 世界最短距离与正式命中中心一致，兼容地图接缝。
function distance(g, n, target) {
  const t = nearest({ x: target.x, y: target.y - 8 }, g.player);
  return Math.hypot(g.player.x + n.x - t.x, g.player.y + n.y - t.y);
}

test('近树不再强制前冲；普通、短程和远程挂载保留各自交战距离', () => {
  for (const [weapon, targetDistance] of [[7, 150], [3, 200], [0, 240], [12, 350], [8, 500], [9, 600]]) {
    const { g, target } = arena([weapon, weapon, weapon], targetDistance);
    tick(g, target, 3);
    const band = funnelEngagement(WEAPONS[weapon], target);
    for (const n of g.funnel.nodes) {
      assert.ok(distance(g, n, target) >= band.minimum - 3, `${weapon} 安全圈`);
      assert.ok(distance(g, n, target) <= WEAPONS[weapon].range, `${weapon} 原枪射程`);
      assert.equal(n.flight.mode, 'attack');
    }
  }
  const { g, target } = arena([0, 8, 9], 90, 'tree');
  tick(g, target, 3);
  assert.ok(g.funnel.nodes.every(n => distance(g, n, target) > 120));
  assert.ok(distance(g, g.funnel.nodes[1], target) > distance(g, g.funnel.nodes[0], target) + 90);
});

test('目标不足 70 单位的逼近也能触发后撤；小幅移动不反复换位', () => {
  const { g, target } = arena([7, 7, 7], 155);
  tick(g, target, 3);
  const n = g.funnel.nodes[0];
  const station = { ...n.flight.station };
  target.x += 3;
  tick(g, target, 1);
  assert.deepEqual(n.flight.station, station);
  // 沿炮体方向逼近 55 单位，未达到旧逻辑 70 单位的重规划门槛。
  const d = distance(g, n, target);
  target.x += (g.player.x + n.x - target.x) / d * 55;
  target.y += (g.player.y + n.y - (target.y - 8)) / d * 55;
  tick(g, target, 2);
  assert.notDeepEqual(n.flight.station, station);
  assert.ok(distance(g, n, target) >= funnelEngagement(n.weapon, target).minimum - 3);
  const settled = { ...n.flight.station };
  tick(g, target, 3);
  assert.deepEqual(n.flight.station, settled);
  assert.equal(n.flight.mode, 'attack');
});

test('近身 Boss 在三种竖屏保持安全距离、射程和炮体分离', () => {
  for (const width of [320, 390, 580]) {
    const { g, target } = arena([0, 0, 0], 85, 'boss', width);
    tick(g, target, 3);
    const b = funnelFlightBounds(g.viewport);
    for (const [i, n] of g.funnel.nodes.entries()) {
      assert.ok(distance(g, n, target) > target.radius + 55);
      assert.ok(distance(g, n, target) < n.weapon.range);
      assert.ok(n.x >= b.minX && n.x <= b.maxX && n.y >= b.minY && n.y <= b.maxY);
      for (const other of g.funnel.nodes.slice(i + 1))
        assert.ok(Math.hypot(n.x - other.x, n.y - other.y) > 55);
    }
  }
});

test('接缝附近仍按最近目标规划，移动目标与玩家换边不产生超远射位', () => {
  const { g, target } = arena([0, 8, 9], 100);
  g.player.x = WORLD.width - 10;
  target.x = 30;
  tick(g, target, 2);
  const before = g.funnel.nodes.map(n => ({ x: g.player.x + n.x, y: g.player.y + n.y }));
  g.player.x = 1;
  tick(g, target, 1 / 120);
  for (const [i, n] of g.funnel.nodes.entries()) {
    const p = nearest({ x: g.player.x + n.x, y: g.player.y + n.y }, before[i]);
    assert.ok(Math.hypot(p.x - before[i].x, p.y - before[i].y) < 15);
  }
  tick(g, target, 3);
  assert.ok(g.funnel.nodes.every(n => distance(g, n, target) > 100));
});
