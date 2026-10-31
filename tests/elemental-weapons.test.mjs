// 元素枪验证真实碰撞、连锁上限、跨边界与冰冻时序。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { fireBallistics } from '../src/combat/ballistics.js';
import { updateEnemyAttack, createEnemyAttack } from '../src/combat/enemy-attack.js';
import { WORLD } from '../src/world/coordinates.js';

// 清空随机场景，保留实际伤害与弹道处理。
function arena(index) {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  g.progress.weapons[index] = 1;
  g.progress.weapon = index;
  return g;
}
// 高生命静止靶隔离击退和击杀，不改变碰撞中心。
function target(id, x, y = 700, type = 'enemy') {
  return {
    id,
    x,
    y,
    type,
    hp: 1000,
    maxHp: 1000,
    radius: 17,
    speed: 100,
    mass: 1,
    assault: createEnemyAttack(),
  };
}
test('电弧最多连锁三个不同目标、逐跳衰减，潮湿目标增伤', () => {
  const g = arena(10);
  g.enemies = [target(1, 1000), target(2, 1100), target(3, 1200), target(4, 1300)];
  g.enemies[0].wet = 1;
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, 100, false);
  assert.deepEqual(
    g.enemies.map((e) => 1000 - e.hp),
    [125, 80, 64, 0],
  );
  assert.equal(g.shots.length, 3);
});
test('电弧首击被树挡住；地图接缝仍可连锁，不绘制横跨整图的电线', () => {
  const g = arena(10);
  g.trees = [target(8, 970, 700, 'tree')];
  g.enemies = [target(1, 1040)];
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, 100, false);
  assert.equal(g.trees[0].hp, 900);
  assert.equal(g.enemies[0].hp, 1000);
  assert.equal(g.shots.length, 1);
  g.trees = [];
  g.shots = [];
  g.player.x = WORLD.width - 60;
  g.enemies = [target(1, WORLD.width - 10), target(2, 50), target(3, 150)];
  fireBallistics(g, g.weapon(), { x: WORLD.width - 40, y: 692 }, { x: 1, y: 0 }, 100, false);
  assert.equal(g.shots.length, 3);
  assert.ok(g.shots.every((s) => Math.abs(s.ex - s.x) < 160));
});
test('分叉改装实际命中五个敌人，每个击杀均给来源枪熟练度', () => {
  const g = arena(10);
  g.progress.mastery[10] = 40;
  g.progress.mods[10] = 1;
  g.enemies = Array.from({ length: 6 }, (_, i) => ({ ...target(i + 1, 1000 + i * 60), hp: 1 }));
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, 100, false);
  assert.equal(g.kills, 5);
  assert.equal(g.progress.mastery[10], 60);
  assert.equal(g.enemies[5].hp, 1);
});
test('冰晶能达到远端射程并减速，领主有抗性，树木不会获得冰冻状态', () => {
  const g = arena(11);
  const e = target(1, 1240);
  g.enemies = [e];
  fireBallistics(g, g.weapon(), { x: 920, y: 692 }, { x: 1, y: 0 }, 50, false);
  g.updateProjectiles(0.6);
  assert.equal(e.hp, 950);
  assert.equal(e.chill, 2);
  assert.equal(e.chillFactor, 0.6);
  const boss = target(2, 1100, 700, 'boss'),
    tree = target(3, 1100, 700, 'tree');
  for (const t of [boss, tree])
    g.hit(t, 1, false, { impulse: 0, chillFactor: 0.4, chillDuration: 2.5, weaponIndex: 11 });
  assert.equal(boss.chillFactor, 0.82);
  assert.equal(tree.chill, undefined);
});
test('冰冻放慢追击和扑击时钟，解冻无倒退；暂停冻结减速时间', () => {
  // 使用真实可达陆地隔离减速比例，河心目标现在会触发战术退让。
  const player = { x: 1200, y: 700 },
    normal = target(1, 900),
    slow = target(2, 900);
  slow.chill = 2;
  slow.chillFactor = 0.6;
  updateEnemyAttack(normal, player, player, 0.1, WORLD);
  updateEnemyAttack(slow, player, player, 0.1, WORLD);
  assert.ok(Math.abs((slow.x - 900) / (normal.x - 900) - 0.6) < 1e-6);
  const e = target(3, 900);
  const near = { x: 980, y: 700 };
  updateEnemyAttack(e, near, near, 0.01, WORLD);
  updateEnemyAttack(e, near, near, 0.5, WORLD);
  e.chill = 2;
  e.chillFactor = 0.6;
  const before = e.x;
  updateEnemyAttack(e, near, near, 0.04, WORLD);
  assert.ok(e.x > before);
  e.chill = 0;
  const chilled = e.x;
  updateEnemyAttack(e, near, near, 0.04, WORLD);
  assert.ok(e.x > chilled);
  const g = arena(11);
  g.enemies = [slow];
  // 隔离状态时钟，不让新手主线对白中断正式战斗更新。
  g.workshopTrial=true;
  g.start();
  g.spawnTimer = g.attackTimer = 999;
  g.pause();
  g.update(0.05);
  assert.equal(slow.chill, 2);
  g.pause();
  for (let i = 0; i < 45; i++) g.update(0.05);
  assert.equal(slow.chill, 0);
  assert.equal(slow.chillFactor, 1);
});
