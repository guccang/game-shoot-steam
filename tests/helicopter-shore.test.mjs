import {summonBossAtNode} from './helpers/boss-node.mjs';
// 直升机河面悬停回归：本岸等待、沿岸追踪、过桥恢复与近远程攻击分离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainBlocked } from '../src/physics/terrain-navigation.js';
import { groundPursuit, hoveringOverWater } from '../src/physics/ground-pursuit.js';
import { createEnemyAttack, updateEnemyAttack } from '../src/combat/enemy-attack.js';
import { updateBoss, updateBossHazards } from '../src/combat/bosses.js';
import { Game, freshProgress, WORLD } from '../src/game.js';
import { canonical, worldDistance } from '../src/world/coordinates.js';
import { isWaterBlocked, riverXAt, BRIDGE } from '../src/world/river-geometry.js';

// 选择远离桥梁的河段，构造两岸地面追兵和河面低空目标。
function scene(side = -1, id = 3, y = 1100) {
  const p = { x: riverXAt(y), y, flying: true };
  const e = { id, type: 'enemy', x: p.x + side * 200, y,
    hp: 100, radius: 17, speed: 80, assault: createEnemyAttack() };
  return { e, p };
}

// 使用真实攻击状态机小步推进，逐帧验证脚底未进入水域。
function advance(e, p, seconds) {
  let damage = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    damage += updateEnemyAttack(e, p, p, 1 / 60, WORLD);
    assert.equal(terrainBlocked(e.x,e.y,12),false);
  }
  return damage;
}

test('河面悬停时两岸怪物退开警戒，停止绕桥且不隔水扑击', () => {
  for (const side of [-1, 1]) {
    const positions = [];
    for (const id of [2, 3, 4]) {
      const { e, p } = scene(side, id);
      assert.equal(advance(e, p, 8), 0);
      assert.equal(e.assault.phase, 'chase');
      assert.equal(e.groundPursuit.side, side);
      assert.ok((e.x - riverXAt(e.y)) * side > 50);
      assert.ok(worldDistance(e, p) > 380, '必须退出默认射程，不在岸边送伤害');
      // 东岸新增长湖后允许短距离沿凹岸退让，仍留在本地且不靠近北方桥头。
      assert.ok(Math.abs(e.y-p.y)<150 && e.y>BRIDGE.y+BRIDGE.height+140,'必须绕开湖泊在本岸警戒');
      const before = { x: e.x, y: e.y };
      advance(e, p, 2);
      assert.ok(worldDistance(e, before) < 0.01, '到站后应稳定等待');
      positions.push(`${e.x},${e.y}`);
    }
    assert.equal(new Set(positions).size, 3, '不同追兵使用不同岸边站位');
  }
});

test('直升机沿弯曲河道移动时怪物留在安全陆地，不沿岸追着送伤害', () => {
  for (const side of [-1, 1]) {
    const { e, p } = scene(side);
    for (let i = 0; i < 1200; i++) {
      p.y += 0.5; p.x = riverXAt(p.y);
      updateEnemyAttack(e, p, p, 1 / 60, WORLD);
      assert.equal(isWaterBlocked(e.x, e.y, 12), false);
      assert.equal(e.groundPursuit.side, side);
    }
    assert.ok(worldDistance(e, p) > 380);
    assert.ok(e.y < 1250, '目标沿河远离后应保持警戒，不再尾随');
  }
});

test('水面左右移动与短暂掠过陆地不切换岸侧，稳定上岸半秒后恢复桥梁导航', () => {
  const { e, p } = scene();
  groundPursuit(e, p, 0.01);
  for (const offset of [-20, 20, -15, 15]) {
    p.x = riverXAt(p.y) + offset;
    assert.equal(groundPursuit(e, p, 0.1).holding, true);
    assert.equal(e.groundPursuit.side, -1);
  }
  p.x = riverXAt(p.y) + 180;
  assert.equal(groundPursuit(e, p, 0.4).holding, true);
  p.x = riverXAt(p.y);
  assert.equal(groundPursuit(e, p, 0.1).holding, true);
  p.x += 180;
  assert.equal(groundPursuit(e, p, 0.3).holding, true);
  const result = groundPursuit(e, p, 0.2);
  assert.equal(result.holding, false);
  assert.equal(result.direct, false);
  assert.equal(result.goal.y, BRIDGE.y + BRIDGE.height / 2);
  assert.equal(e.groundPursuit, undefined);
});

test('落地立即恢复普通追击，桥面属于可达陆地', () => {
  const { e, p } = scene();
  groundPursuit(e, p, 0.01);
  p.flying = false; p.x = e.x + 60;
  assert.equal(groundPursuit(e, p, 0.01).direct, true);
  updateEnemyAttack(e, p, p, 0.01, WORLD);
  assert.equal(e.assault.phase, 'windup');
  assert.equal(hoveringOverWater({ flying: true, x: BRIDGE.x + 110, y: BRIDGE.y + 39 }), false);
});

test('岸边规划有四分之一秒缓存，瀑布和循环地图接缝保持干地与短距离', () => {
  const { e, p } = scene();
  groundPursuit(e, p, 0.01);
  const goal = e.groundPursuit.goal;
  p.y += 1;
  groundPursuit(e, p, 0.1);
  assert.equal(e.groundPursuit.goal, goal);
  groundPursuit(e, p, 0.2);
  assert.notEqual(e.groundPursuit.goal, goal);
  for (const y of [420, 530, WORLD.height - 5, WORLD.height + 5]) {
    for (const side of [-1, 1]) {
      const { e: body, p: target } = scene(side, 3, canonical({ x: 0, y }).y);
      body.y = y; target.y = y;
      const result = groundPursuit(body, target, 0.01);
      assert.equal(isWaterBlocked(result.goal.x, result.goal.y, 12), false);
      assert.ok(worldDistance(body, result.goal) < 300);
      assert.equal(advance(body, target, 5), 0);
    }
  }
});

test('扑击途中目标飞入水面时不会隔岸伤害，原攻击正常结束回位', () => {
  const { e, p } = scene();
  p.x = e.x + 60; p.flying = false;
  updateEnemyAttack(e, p, p, 0.01, WORLD);
  assert.equal(e.assault.phase, 'windup');
  const origin = { x: e.x, y: e.y };
  p.x = riverXAt(p.y); p.flying = true;
  assert.equal(advance(e, p, 1.3), 0);
  assert.equal(e.assault.phase, 'recovery');
  assert.ok(worldDistance(e, origin) < 0.001);
});

// 使用真实领主配置验证技能，关闭普通刷怪以隔离导航与跨水伤害。
function bossScene(index) {
  const progress = freshProgress(); progress.bosses = index;
  const g = new Game(progress, () => 0.5);
  g.start(); g.enemies = []; g.trees = []; g.kills = 12; summonBossAtNode(g);
  g.player.x = riverXAt(1100); g.player.y = 1100; g.player.flying = true;
  Object.assign(g.boss, { x: g.player.x - 160, y: 1100, attack: 0 });
  let damage = 0;
  g.hurt = amount => { damage += amount; };
  return { g, damage: () => damage };
}

test('野猪与巨兽在岸边等待，远程领主仍能施放技能威胁直升机', () => {
  for (const index of [0, 4]) {
    const { g, damage } = bossScene(index);
    for (let i = 0; i < 600; i++) {
      updateBoss(g, 1 / 60); updateBossHazards(g, 1 / 60);
    }
    assert.equal(g.hazards.length, 0);
    assert.equal(damage(), 0);
    assert.ok(Math.abs(g.boss.y - g.player.y) < 20, '领主不使用杂兵纵向分散站位');
    assert.equal(isWaterBlocked(g.boss.x, g.boss.y, 12), false);
  }
  for (const index of [1, 2, 3]) {
    const { g, damage } = bossScene(index);
    updateBoss(g, 0.01);
    assert.ok(g.hazards.length > 0);
    for (let i = 0; i < 240; i++) updateBossHazards(g, 1 / 60);
    assert.ok(damage() > 0, `远程领主 ${index} 应保留对低空目标的伤害`);
  }
});

test('已预警的地面重砸不会伤害后来飞到河面的目标', () => {
  const { g, damage } = bossScene(4);
  g.hazards = [{ owner: g.boss.id, kind: 'slam', x: g.player.x, y: g.player.y,
    radius: 78, age: 0, warmup: 0.1, duration: 0.3, damage: 30 }];
  updateBossHazards(g, 0.2);
  assert.equal(damage(), 0);
});
