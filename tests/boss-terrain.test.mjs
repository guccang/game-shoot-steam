import {summonBossAtNode} from './helpers/boss-node.mjs';
// 领主弱击退、技能毁树与采集归属回归，使用实际战斗和物理更新。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { BOSSES } from '../src/config/bosses.js';
import { WEAPONS } from '../src/config/weapons.js';
import { applyImpulse, stepBodies } from '../src/physics/motion.js';
import { WORLD } from '../src/world/coordinates.js';
import { updateBossHazards } from '../src/combat/bosses.js';
import { breakTreesAlong, breakTreesInRing } from '../src/combat/boss-terrain.js';

// 保留技能和伤害逻辑，仅关闭普通刷怪及玩家自动攻击。
function arena(index = 0) {
  const progress = freshProgress();
  progress.bosses = index;
  const game = new Game(progress, () => 0.5);
  game.start();
  game.trees = []; game.enemies = [];
  game.updateWaves = () => {};
  game.attackTimer = 999;
  game.player.x = 1000; game.player.y = 700; game.player.invincible = 999;
  // 技能几何使用独立试练场，生活区保护另由常驻世界专项覆盖。
  game.player.arena={x:1000,y:700,radius:4000};
  game.kills = 12;
  summonBossAtNode(game);
  Object.assign(game.boss, { x: 800, y: 700, hp: 1e6, maxHp: 1e6, speed: 0, attack: 0 });
  return game;
}

// 测试树保留真实再生所需信息，可直接覆盖地图接缝与危险区边缘。
function tree(game, x, y, radius = 12) {
  const item = { id: game.nextId++, type: 'tree', x, y, radius, hp: 55,
    size: 1, variant: 0, palette: 'meadow', flash: 0 };
  game.trees.push(item);
  return item;
}

// 用生产时间步推进，验证暂停与阶段边界而非直接调用破坏替代技能。
function advance(game, time) {
  for (let t = 0; t < time - 1e-8; t += 0.01) game.update(Math.min(0.01, time - t));
}

test('所有武器统一命中可小幅推动领主，但不腾空或中断施法', () => {
  const g = arena(), boss = g.boss;
  boss.ai = { phase: 'windup', elapsed: 0.25 };
  for (const [index, weapon] of WEAPONS.entries()) {
    boss.pushX = boss.pushY = boss.bossPushBoost = 0;
    const hp = boss.hp;
    g.hit(boss, 10, false, { weaponIndex: index, direction: { x: 1, y: 0 },
      impulse: weapon.impulse ?? 100, power: 3, water: true, chillDuration: 1, chillFactor: 0.4 });
    assert.equal(boss.hp, hp - 10);
    const limit = weapon.id === 'pulse' ? 180 : weapon.id === 'sniper' ? 125 : 55;
    assert.ok(boss.pushX > 0 && boss.pushX <= limit + 0.000001);
    assert.equal(boss.knockTime || 0, 0);
    assert.equal(boss.vz || 0, 0);
    assert.equal(boss.ai.phase, 'windup');
  }
  assert.ok(boss.wet > 0 && boss.chill > 0);
  assert.equal(boss.chillFactor, 0.82);
  const enemy = { type: 'enemy', x: 600, y: 700, hp: 100 };
  g.hit(enemy, 10, false, { direction: { x: 1, y: 0 }, impulse: 80 });
  assert.ok(enemy.pushX > 0 && enemy.knockTime > 0);
  g.hit(boss, 2e6, false, { direction: { x: 1, y: 0 }, impulse: 200, power: 3 });
  assert.equal(boss.vz || 0, 0);
  assert.equal(g.boss, null);
});

test('小怪碰撞不能绕过领主体重造成间接击退，碰撞顺序不影响结果', () => {
  for (const reverse of [false, true]) {
    const boss = { id: 1, type: 'boss', x: 800, y: 700, radius: 48,
      pushX: 0, pushY: 0, z: 4, vz: 80, knockTime: 0.4, rollAngle: 1 };
    const enemy = { id: 2, type: 'enemy', x: 730, y: 700, radius: 17 };
    applyImpulse(enemy, { x: 1, y: 0 }, 100);
    const bodies = reverse ? [boss, enemy] : [enemy, boss];
    for (let i = 0; i < 50; i++) stepBodies(bodies, 0.01, WORLD);
    assert.deepEqual([boss.x, boss.y, boss.pushX, boss.pushY, boss.z, boss.vz, boss.knockTime], [800, 700, 0, 0, 0, 0, 0]);
    assert.ok(enemy.x < 735);
  }
});

test('领主单次击退短于普通怪，斜向集火限速，30与120帧位移一致并自然停止', () => {
  const distances = [];
  for (const fps of [30, 120]) {
    const boss = { type: 'boss', x: 800, y: 700, mass: 6, radius: 48 },
      enemy = { type: 'enemy', x: 800, y: 700, mass: 1, radius: 17 };
    for (let i = 0; i < 20; i++) applyImpulse(boss, { x: 0.6, y: 0.8 }, 165, 760);
    assert.ok(Math.hypot(boss.pushX, boss.pushY) <= 55.000001);
    applyImpulse(enemy, { x: 0.6, y: 0.8 }, 165, 760);
    for (let i = 0; i < fps; i++) {
      stepBodies([boss], 1 / fps, WORLD);
      stepBodies([enemy], 1 / fps, WORLD);
    }
    const distance = Math.hypot(boss.x - 800, boss.y - 700);
    assert.ok(distance > 4 && distance < 6);
    assert.ok(distance < Math.hypot(enemy.x - 800, enemy.y - 700) * 0.1);
    assert.deepEqual([boss.pushX, boss.pushY, boss.knockTime, boss.z, boss.rollAngle], [0, 0, 0, 0, 0]);
    distances.push(distance);
  }
  assert.ok(Math.abs(distances[0] - distances[1]) < 0.01);
});

test('领主击退遇树停止，暂停冻结，五种技能前摇不会被受击重置', () => {
  const blockedBoss = { type: 'boss', x: 800, y: 700, mass: 6 };
  applyImpulse(blockedBoss, { x: 1, y: 0 }, 165);
  stepBodies([blockedBoss], 0.2, WORLD, () => {}, [{ x: 830, y: 700, radius: 18, hp: 55 }]);
  assert.equal(blockedBoss.x, 800); assert.equal(blockedBoss.pushX, 0);
  for (let index = 0; index < BOSSES.length; index++) {
    const g = arena(index), b = g.boss;
    g.update(0.01);
    const ai = b.ai, elapsed = ai.elapsed;
    g.hit(b, 1, false, { direction: { x: 0, y: 1 }, impulse: 110 });
    g.pause(); const position = [b.x, b.y, b.pushY];
    advance(g, 0.2); assert.deepEqual([b.x, b.y, b.pushY], position);
    g.pause(); advance(g, 0.1);
    assert.ok(b.y > position[1]); assert.equal(b.ai, ai);
    assert.equal(ai.phase, 'windup'); assert.ok(ai.elapsed > elapsed);
  }
});

test('野猪冲锋受到侧向击退，路线提示随实际位移平移且冲刺继续', () => {
  const g = arena(0), b = g.boss;
  g.update(0.01); advance(g, BOSSES[0].windup + 0.05);
  assert.equal(b.ai.phase, 'cast');
  const lane = g.hazards.find(h => h.kind === 'charge'), y = b.y, laneY = lane.y,
    x = b.x, elapsed = b.ai.elapsed;
  g.hit(b, 1, false, { direction: { x: 0, y: 1 }, impulse: 165 });
  g.update(0.05);
  assert.ok(b.x > x && b.y > y); assert.ok(b.ai.elapsed > elapsed);
  assert.equal(b.ai.phase, 'cast');
  assert.ok(Math.abs((b.y - y) - (lane.y - laneY)) < 0.001);
});

test('五种领主前摇不毁树，实际技能破坏范围内树木，保留范围外树与采集库存', () => {
  for (let index = 0; index < BOSSES.length; index++) {
    const g = arena(index), profile = BOSSES[index];
    const hit = tree(g, [900, 1000, 950, 950, 1000][index], 700);
    const miss = tree(g, 800, 1050);
    let shattered = false;
    const impact = g.fx.impact.bind(g.fx);
    // 记录实际破碎调用，长持续技能结束时碎屑可能已经自然消失。
    g.fx.impact = (...args) => {
      if (args[0].target === hit && args[4]) shattered = true;
      impact(...args);
    };
    const progress = JSON.stringify(g.progress), chopped = g.chopped;
    g.update(0.01);
    advance(g, profile.windup - 0.05);
    assert.equal(hit.hp, 55, profile.id + '前摇毁树');
    g.pause(); advance(g, 1); assert.equal(hit.hp, 55); g.pause();
    advance(g, profile.active + 0.15);
    assert.equal(hit.hp, 0, profile.id + '技能未毁树');
    assert.equal(miss.hp, 55);
    assert.equal(g.stumps.filter(s => s.x === hit.x && s.y === hit.y).length, 1);
    assert.equal(g.chopped, chopped);
    assert.equal(JSON.stringify(g.progress), progress);
    assert.equal(g.drops.length, 0);
    assert.ok(shattered);
  }
});

test('扫掠和波环跨地图边界不漏树，内圈不误伤，重复攻击不重复生成树桩', () => {
  const g = arena();
  const seam = tree(g, 4, 700), miss = tree(g, 4, 850);
  breakTreesAlong(g, { x: WORLD.width - 50, y: 700 }, { x: 50, y: 700 }, 10);
  assert.equal(seam.hp, 0); assert.equal(miss.hp, 55);
  const inside = tree(g, 4, 700, 5), ring = tree(g, 85, 700, 5);
  breakTreesInRing(g, { x: WORLD.width - 5, y: 700 }, 80, 100);
  assert.equal(inside.hp, 55); assert.equal(ring.hp, 0);
  breakTreesInRing(g, { x: WORLD.width - 5, y: 700 }, 80, 100);
  assert.equal(g.stumps.length, 2);
  const growth = tree(g, 85, 700, 5);
  breakTreesInRing(g, { x: WORLD.width - 5, y: 700 }, 80, 100);
  assert.equal(growth.hp, 0);
});

test('羽刃命中过玩家后继续毁树，失效或已结束的技能不毁树', () => {
  const g = arena(2), victim = tree(g, 950, 700);
  const h = { owner: g.boss.id, kind: 'feather', x: 800, y: 700, dx: 1, dy: 0,
    speed: 300, radius: 10, age: 0, warmup: 0.2, duration: 1.4, hit: true, damage: 30 };
  g.hazards = [h];
  updateBossHazards(g, 0.1); assert.equal(victim.hp, 55);
  updateBossHazards(g, 0.8); assert.equal(victim.hp, 0);
  const late = tree(g, 800, 700);
  g.hazards = [{ ...h, kind: 'slam', radius: 78, age: 2 }];
  updateBossHazards(g, 0.05); assert.equal(late.hp, 55);
  g.hazards = [{ ...h, kind: 'slam', radius: 78, age: 0.2 }];
  g.boss = null;
  updateBossHazards(g, 0.05); assert.equal(late.hp, 55);
});

test('玩家伐木仍发放原奖励，领主毁树留下的树桩可正常再生', () => {
  const g = arena(), playerTree = tree(g, 650, 700);
  const coins = g.progress.coins, wood = g.progress.wood, chopped = g.chopped;
  g.hit(playerTree, 100);
  assert.equal(g.progress.coins, coins + 4);
  assert.equal(g.progress.wood, wood + 8);
  assert.equal(g.chopped, chopped + 1);
  tree(g, 700, 700);
  breakTreesAlong(g, { x: 680, y: 700 }, { x: 720, y: 700 }, 10);
  g.stumps.find(s => s.x === 700).life = 0.001;
  g.boss.attack = 999;
  g.update(0.01);
  assert.ok(g.trees.some(t => t.x === 700 && t.hp > 0));
});
