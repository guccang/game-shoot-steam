import { equipmentRecipe } from '../src/progression/equipment-goals.js';
import { WORLD } from '../src/world/coordinates.js';
// 星环浮游炮验收：真实调度、目标优先级、资源守恒、来源归属与默认视野。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { WEAPON_DISPLAY_ORDER } from '../src/config/weapons.js';
import { FUNNEL_INDEX, funnelTargets, updateFunnel, funnelMuzzle } from '../src/combat/funnel.js';
import { advanceReload } from '../src/combat/magazine.js';
import { fireBallistics } from '../src/combat/ballistics.js';
import { CombatCamera } from '../src/rendering/camera.js';
import { drawFunnelArray } from '../src/rendering/funnel.js';
import { funnelFlightBounds } from '../src/combat/funnel-movement.js';
import { FX_LIMIT } from '../src/combat/effects.js';

// 出击后改用视口安全范围，近身低动态阵列仍保留原来的紧凑布局。
function assertFlightVisible(node, game) {
  const b = funnelFlightBounds(game.viewport);
  assert.ok(node.x >= b.minX && node.x <= b.maxX && node.y >= b.minY && node.y <= b.maxY);
  assert.ok(Math.hypot(node.x, node.y) <= 270.001);
}

// 平坦靶场隔离地形和敌人 AI，仍使用正式武器、碰撞及奖励入口。
function arena(index = FUNNEL_INDEX) {
  const p = freshProgress();
  p.weapons.fill(1);
  p.weapon = index;
  const shots = [];
  const g = new Game(
    p,
    () => 0.5,
    (type, data) => {
      if (type === 'shot') shots.push({ time: g.time, ...data });
    },
  );
  g.start();
  g.trees = [];
  g.enemies = [];
  g.boss = null;
  g.spawnTimer = 999;
  return { g, shots };
}

// 固定位置的目标提供可控血量与实体编号。
function target(id, x = 1130, y = 700, type = 'enemy', hp = 1000000) {
  return { id, x, y, type, hp, maxHp: hp, radius: 17, flash: 0, size: 1 };
}

// 单独推进控制器与真实弹道，模拟时间不涉及敌人移动和波次刷新。
function tick(g, seconds, dt = 1 / 120) {
  while (seconds > 1e-8) {
    const step = Math.min(dt, seconds);
    seconds -= step;
    g.time += step;
    advanceReload(g.magazines[g.progress.weapon], g.weapon(), step);
    updateFunnel(g, step);
    g.updateProjectiles(step);
  }
}

// 完整游戏入口用于检查暂停、移动、切枪与死亡的冻结语义。
function gameTick(g, seconds, input = { x: 0, y: 0 }) {
  while (seconds > 1e-8) {
    const dt = Math.min(1 / 120, seconds);
    seconds -= dt;
    g.update(dt, input);
  }
}

test('末尾追加终局武器，旧存档不改编号，购买严格校验十八领主和两种资源', () => {
  assert.equal(WEAPONS.length, 17);
  assert.equal(WEAPONS[12].id, 'funnel');
  assert.equal(WEAPON_DISPLAY_ORDER.at(-1), 16);
  const old = freshProgress();
  old.weapon = 9;
  old.weapons = Array(12).fill(2);
  old.mastery = Array(12).fill(40);
  old.mods = Array(12).fill(1);
  const restored = validateProgress(old);
  assert.equal(restored.weapon, 9);
  assert.deepEqual(restored.weapons.slice(0, 12), old.weapons);
  for (const key of ['weapons', 'mastery', 'mods']) assert.equal(restored[key][12], 0);
  const g = new Game(freshProgress());
  const price=equipmentRecipe('weapons',12);
  g.progress.materials={parts:price.parts,crystal:price.crystal,core:price.core};
  Object.assign(g.progress, { bosses: price.bosses-1, coins: price.coins, wood: price.wood });
  assert.equal(g.transact('weapons', 12, 'buy'), false);
  g.progress.bosses = price.bosses;
  g.progress.wood = price.wood-1;
  assert.equal(g.transact('weapons', 12, 'buy'), false);
  g.progress.wood = price.wood;
  g.progress.coins = price.coins-1;
  assert.equal(g.transact('weapons', 12, 'buy'), false);
  g.progress.coins = price.coins;
  assert.equal(g.transact('weapons', 12, 'buy'), true);
  assert.deepEqual([g.progress.coins, g.progress.wood, g.progress.weapon], [0, 0, 12]);
});

test('稳定分配不同怪物，近邻出现不抢锁，数量不足允许集火，Boss 优先且离开立即恢复', () => {
  const { g } = arena();
  g.enemies = [target(3), target(2, 1130), target(1, 1130)];
  g.trees = [target(10, 930, 700, 'tree')];
  assert.deepEqual(
    funnelTargets(g, g.weapon()).map((t) => t.id),
    [1, 2, 3],
  );
  updateFunnel(g, 0.1);
  g.enemies.push(target(4, 950));
  updateFunnel(g, 0.1);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [1, 2, 3],
  );
  g.enemies.find((t) => t.id === 2).hp = 0;
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [1, 4, 3],
  );
  g.enemies = [target(4, 960)];
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [4, 4, 4],
  );
  g.boss = target(90, 1000, 700, 'boss');
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [90, 90, 90],
  );
  g.boss.x = 1500;
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [4, 4, 4],
  );
  g.enemies = [];
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [10, 10, 10],
  );
  g.trees.push(target(11, 1000, 700, 'tree'), target(12, 1100, 700, 'tree'));
  updateFunnel(g, 0.01);
  assert.equal(new Set(g.funnel.nodes.map((n) => n.targetId)).size, 3);
});

test('无人机：三炮初次展开及错峰开火，持续回能支持持久射击，空场恢复能源', () => {
  const { g, shots } = arena(13);
  tick(g, 2);
  assert.equal(shots.length, 0);
  assert.equal(g.magazines[13].ammo, 36);
  g.enemies = [target(1)];
  tick(g, 0.14);
  assert.equal(shots.length, 0);
  tick(g, 0.02);
  assert.equal(shots.length, 1);
  tick(g, 0.06);
  assert.equal(shots.length, 2);
  tick(g, 0.06);
  assert.equal(shots.length, 3);
  // 持续战斗可超过初始容量；能源逐格恢复，不再等待空仓整批补给。
  tick(g, 25);
  assert.ok(shots.length>36);
  assert.equal(g.magazines[13].remaining,0);
  g.enemies=[];
  const before=g.magazines[13].ammo;tick(g,1);
  assert.ok(g.magazines[13].ammo>before);
  assert.ok(g.magazines[13].ammo<36);
  assert.ok(shots.every((s) => s.kind === 'drone'));
  const initial = arena(13);
  initial.g.enemies = [target(1)];
  tick(initial.g, 0.49);
  assert.equal(initial.shots.length, 0);
  tick(initial.g, 0.02);
  assert.equal(initial.shots.length, 1);
});

test('空场重入保留三炮错峰，转向完成再射击而不重复部署', () => {
  const { g, shots } = arena();
  g.trees = [target(1, 1130, 700, 'tree')];
  tick(g, 0.7);
  g.trees = [];
  tick(g, 2);
  const count = shots.length;
  g.trees = [target(2, 1130, 700, 'tree')];
  tick(g, 0.001);
  assert.equal(shots.length, count);
  tick(g,.6);
  assert.equal(shots.length,count+3);
  assert.equal(g.funnel.deploy,0);
});

test('移动、目标死亡和循环地图换边不会重新增加锁定前摇', () => {
  const { g, shots } = arena();
  g.trees = [target(10, 1130, 700, 'tree')];
  gameTick(g, 0.7, { x: 0, y: 1 });
  assert.equal(shots.length, 3);
  assert.equal(g.funnel.primed, true);
  const cooldowns = g.funnel.nodes.map((n) => n.cooldown);
  g.trees[0].hp = 0;
  g.trees.push(target(11, 1140, 700, 'tree'));
  g.update(0.01, { x: 0, y: 1 });
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [11, 11, 11],
  );
  for (let i = 0; i < 3; i++) assert.ok(g.funnel.nodes[i].cooldown <= cooldowns[i]);
  g.player.x = WORLD.width - 1;
  g.player.y = 700;
  g.trees = [target(12, 80, 700, 'tree')];
  updateFunnel(g, 0.01);
  g.player.x = 1;
  updateFunnel(g, 0.01);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [12, 12, 12],
  );
  for (const n of g.funnel.nodes) assertFlightVisible(n, g);
  g.trees = [target(13, WORLD.width - 200, 700, 'tree')];
  g.funnel.nodes.forEach((n) => (n.cooldown = 0));
  const before=g.magazines[12].modules.reduce((sum,m)=>sum+m.ammo,0);
  updateFunnel(g,0.001);
  assert.equal(g.magazines[12].modules.reduce((sum,m)=>sum+m.ammo,0),before);
  tick(g,.6);
  assert.ok(g.magazines[12].modules.reduce((sum,m)=>sum+m.ammo,0)<before);
});

test('无人机：暂停、死亡和切枪冻结能源与独立冷却，升级与改装不会补能或清空冷却', () => {
  const { g } = arena(13);
  g.trees = [target(1, 1130, 700, 'tree')];
  gameTick(g, 0.7);
  g.pause();
  const frozen = structuredClone([g.magazines[13], g.drone]);
  gameTick(g, 1);
  assert.deepEqual([g.magazines[13], g.drone], frozen);
  g.pause();
  const cooldown = g.drone.nodes.map((n) => n.cooldown);
  g.transact('weapons', 0, 'equip');
  gameTick(g, 1);
  assert.deepEqual(
    g.drone.nodes.map((n) => n.cooldown),
    cooldown,
  );
  const energy = g.magazines[13].ammo;
  g.transact('weapons', 13, 'equip');
  assert.equal(g.magazines[13].ammo, energy);
  Object.assign(g.progress, { coins: 100000, wood: 100000 });
  g.progress.mastery[13] = 40;
  assert.equal(g.transact('weapons', 13, 'upgrade'), true);
  assert.equal(g.modifyWeapon(13, 1), true);
  assert.equal(g.magazines[13].ammo, energy);
  assert.deepEqual(
    g.drone.nodes.map((n) => n.cooldown),
    cooldown,
  );
  assert.equal(g.weapon().range, 480);
  assert.equal(g.weapon().damage, 32 * 0.85 * 1.02);
  assert.equal(g.modifyWeapon(13, 2), true);
  assert.equal(g.weapon().damage, 32 * 1.25 * 1.02);
  assert.equal(g.weapon().interval, 0.9 * 1.25);
  assert.equal(g.weapon().focusFire, true);
  assert.equal(g.weapon().range, 420);
  g.enemies = [target(20), target(21, 1100)];
  updateFunnel(g, 0);
  assert.equal(new Set(g.drone.nodes.map((n) => n.targetId)).size, 1);
  g.magazines[13] = { ammo: 0, remaining: 3.2 };
  g.drone.charging = true;
  g.transact('weapons', 0, 'equip');
  gameTick(g, 1);
  assert.equal(g.magazines[13].remaining, 3.2);
  g.transact('weapons', 13, 'equip');
  g.enemies = [];
  g.trees = [];
  gameTick(g, 1);
  assert.equal(g.magazines[13].remaining,0);assert.equal(g.magazines[13].ammo,2);
  g.state = 'dead';
  gameTick(g, 1);
  assert.equal(g.magazines[13].remaining,0);assert.equal(g.magazines[13].ammo,2);
  g.state = 'playing';
  gameTick(g, 12);
  assert.deepEqual(g.magazines[13], { ammo: 36, remaining: 0, regenProgress:0 });
});

test('真实炮口出弹、首个树干阻挡且只命中一次，无角色到炮口的幽灵伤害', () => {
  const { g } = arena();
  g.trees = [target(1, 970, 692, 'tree')];
  g.enemies = [target(2, 1100, 692)];
  fireBallistics(g, g.weapon(), { x: 940, y: 684 }, { x: 1, y: 0 }, 32, false, true);
  g.updateProjectiles(0.5);
  assert.equal(g.trees[0].hp, 1000000 - 32);
  assert.equal(g.enemies[0].hp, 1000000);
  assert.equal(g.projectiles.length, 0);
  g.updateProjectiles(1);
  assert.equal(g.trees[0].hp, 1000000 - 32);
  g.trees = [target(3, 918, 692, 'tree')];
  g.enemies = [];
  fireBallistics(g, g.weapon(), { x: 960, y: 684 }, { x: 1, y: 0 }, 32, false, true);
  assert.equal(g.trees[0].hp, 1000000);
  assert.equal(g.projectiles[0].originX, 960);
  const d = arena();
  d.g.enemies = [target(10)];
  d.g.funnel.deploy = 0;
  d.g.funnel.primed = true;
  d.g.funnel.hadTargets = true;
  d.g.reducedMotion = true;
  updateFunnel(d.g, 0);
  assert.equal(d.g.projectiles.length, 3);
  for (let i = 0; i < 3; i++) {
    const muzzle = funnelMuzzle(d.g.player, d.g.funnel.nodes[i], true),
      b = d.g.projectiles[i];
    assert.equal(b.originX, muzzle.x);
    assert.equal(b.originY, muzzle.y);
    assert.equal(b.speed, 1200);
    assert.equal(b.amount, 32);
    assert.equal(b.impulse, 32);
  }
  const b = d.g.projectiles[0],
    direction = [b.dx, b.dy];
  d.g.enemies[0].y += 200;
  d.g.updateProjectiles(0.05);
  assert.deepEqual([b.dx, b.dy], direction);
});

test('在途弹切枪后熟练度仍归星环，死亡不重复奖励，无隐藏范围伤害', () => {
  const { g } = arena();
  g.enemies = [target(1, 1040, 692, 'enemy', 1), target(2, 1040, 730)];
  fireBallistics(g, g.weapon(), { x: 940, y: 684 }, { x: 1, y: 0 }, 32, false, true);
  g.transact('weapons', 0, 'equip');
  g.updateProjectiles(0.5);
  assert.equal(g.progress.mastery[12], 4);
  assert.equal(g.progress.mastery[0], 0);
  assert.equal(g.enemies.find((t) => t.id === 2).hp, 1000000);
  g.updateProjectiles(0.5);
  assert.equal(g.progress.mastery[12], 4);
});

test('无人机：固定三炮无暴击单体持续输出为 95–100，30 与 120 帧下无额外齐射', (test) => {
  const results = [];
  for (const dt of [1 / 30, 1 / 120]) {
    const { g, shots } = arena(13);
    const t = target(1, 1130, 700, 'tree');
    g.trees = [t];
    tick(g, 10, dt);
    const hp = t.hp;
    tick(g, 120, dt);
    const dps = (hp - t.hp) / 120;
    results.push(dps);
    test.diagnostic(`${Math.round(1 / dt)} FPS: ${dps.toFixed(2)} DPS`);
    assert.ok(dps >= 95 && dps <= 100, `DPS ${dps}`);
    assert.equal(g.drone.nodes.length, 3);
    assert.ok(g.fx.items.length <= FX_LIMIT);
    assert.ok(shots.length <= 36+Math.ceil(130*36/12.8));
  }
  assert.ok(Math.abs(results[0] - results[1]) < 1);
});

test('密集直线怪群仍由脉冲贯穿占优，星环只有首个实体伤害', () => {
  const damage = [];
  for (const index of [12, 9]) {
    const { g } = arena();
    g.progress.weapon = index;
    g.enemies = Array.from({ length: 6 }, (_, i) => target(i + 1, 1000 + i * 50, 692));
    fireBallistics(g, g.weapon(), { x: 940, y: 684 }, { x: 1, y: 0 }, g.damage(), false, true);
    g.updateProjectiles(1);
    damage.push(g.enemies.reduce((sum, t) => sum + 1000000 - t.hp, 0));
  }
  assert.equal(damage[0], 32);
  assert.ok(damage[1] > damage[0] * 6);
});

test('默认视野跟随，阵列始终有界；减少动态锚点静止，渲染只读且无聚能粒子', () => {
  const { g } = arena();
  g.enemies = [target(1)];
  const camera = new CombatCamera();
  for (const width of [320, 390, 580]) {
    const v = camera.update(
      g.player,
      width,
      844,
      { kind: 'funnel', focus: { x: 3000, y: 3000 } },
      10,
    );
    assert.equal(v.zoom, width < 500 ? 0.85 : 1.05);
    assert.ok(Math.abs((g.player.x - v.x) * v.zoom - width / 2) < 1e-7);
    assert.ok(Math.abs((g.player.y - v.y) * v.zoom - (422-30*v.zoom)) < 1e-7);
  }
  g.reducedMotion = true;
  tick(g, 0.7);
  const anchors = g.funnel.nodes.map((n) => [n.x, n.y]);
  tick(g, 0.3);
  assert.deepEqual(
    g.funnel.nodes.map((n) => [n.x, n.y]),
    anchors,
  );
  const snapshot = JSON.stringify(g.funnel);
  const noop = () => {};
  const context = new Proxy(
    {},
    { get: (o, k) => o[k] ?? noop, set: (o, k, v) => ((o[k] = v), true) },
  );
  drawFunnelArray(context, g.player, g.funnel, true);
  assert.equal(JSON.stringify(g.funnel), snapshot);
  g.reducedMotion = false;
  for (let i = 0; i < 200; i++) {
    g.player.x += 10;
    g.player.y -= 10;
    updateFunnel(g, 1 / 60);
    for (const n of g.funnel.nodes) assertFlightVisible(n, g);
  }
});
