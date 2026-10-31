// 视觉增强回归：爆裂不增加伤害，后坐独立，粒子有界且不影响战斗随机源。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { CombatFX, FX_LIMIT } from '../src/combat/effects.js';
import { fireBallistics } from '../src/combat/ballistics.js';
import { createFunnelState } from '../src/combat/funnel.js';
import { triggerRecoil, updateRecoil, RECOIL_PROFILES } from '../src/combat/recoil.js';

test('更强独立后坐错峰响应，未发射炮体不动，0.9 秒内基本归位', () => {
  const state = createFunnelState();
  triggerRecoil(state.nodes[0].recoil, 12);
  assert.equal(state.nodes[1].recoil.kick, 0);
  assert.equal(state.nodes[2].recoil.kick, 0);
  let peak = 0;
  for (let i = 0; i < 108; i++) {
    updateRecoil(state.nodes[0].recoil, 12, 1 / 120);
    peak = Math.max(peak, state.nodes[0].recoil.kick);
  }
  assert.ok(peak > 5 && peak <= 8);
  assert.ok(Math.abs(state.nodes[0].recoil.kick) < 0.02);
  assert.equal(RECOIL_PROFILES[12].flash, 0.14);
});

test('定向爆裂只生成视觉粒子，首个命中仍为 32 伤害，邻居不受范围伤害', () => {
  const p = freshProgress();
  p.weapons[12] = 1;
  p.weapon = 12;
  let randomCalls = 0;
  const g = new Game(p, () => {
    randomCalls++;
    return 0.5;
  });
  g.enemies = [];
  g.trees = [];
  g.addTree(1040, 700, { hp: 1000, maxHp: 1000 });
  g.addTree(1040, 760, { hp: 1000, maxHp: 1000 });
  const visualImpact = g.fx.funnelImpact.bind(g.fx);
  // 普通命中本身会使用游戏随机源，只验证新增视觉发射器不消费它。
  g.fx.funnelImpact = (hit, bullet) => {
    const before = randomCalls;
    visualImpact(hit, bullet);
    assert.equal(randomCalls, before);
  };
  fireBallistics(g, g.weapon(), { x: 940, y: 692 }, { x: 1, y: 0 }, 32, false, true);
  g.updateProjectiles(0.2);
  assert.equal(g.trees[0].hp, 968);
  assert.equal(g.trees[1].hp, 1000);
  assert.equal(g.fx.items.filter((p) => p.kind === 'funnel-burst').length, 1);
  assert.ok(g.fx.items.filter((p) => p.kind === 'spark' && p.color === '#edffe2').length >= 4);
  assert.equal(g.projectiles.length, 0);
  assert.equal(g.fx.shake.life, 0);
});

test('连续爆裂不会无限累积，特效结束全部释放', () => {
  const fx = new CombatFX(() => 0.5);
  for (let i = 0; i < 1000; i++)
    fx.funnelImpact({ x: 10, y: 20 }, { dx: 1, dy: 0, critical: i % 2 === 0 });
  assert.equal(fx.items.length, FX_LIMIT);
  assert.ok(fx.items.every((p) => Number.isFinite(p.vx) && Number.isFinite(p.angle)));
  fx.update(1);
  assert.equal(fx.items.length, 0);
});
