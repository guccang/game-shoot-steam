// 九寨沟集成回归：真实水界、地图隔离、旅行状态、存档和秘境往返必须同时成立。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { validateProgress } from '../src/progression/progress.js';
import { JIUZHAIGOU_LAKES, JIUZHAIGOU_FALLS, JIUZHAIGOU_SIGNPOSTS, JIUZHAIGOU_UNDERSTORY, JIUZHAIGOU_SLOPES, JIUZHAIGOU_SPAWN, jiuzhaigouTrees, valleyBlocked, valleyTouches, valleyPathDistance, valleySignClearing } from '../src/world/jiuzhaigou.js';
import { NATURAL_TERRAIN } from '../src/world/natural-terrain.js';
import { blocked, moveBody } from '../src/physics/motion.js';
import { nearestDryTerrain, terrainBlocked, terrainLineClear, naturalWaypoint } from '../src/physics/terrain-navigation.js';
import { landingPoint } from '../src/combat/vehicle-landing.js';
import { spawnEnemy } from '../src/core/enemy-manager.js';
import { findArrivalSpot } from '../src/core/enemy-arrival.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { enterRealm, leaveRealm } from '../src/core/realm-manager.js';

// 地名覆盖和真实干地约束一起检查，避免地图目录有名称而游戏现场没有牌子。
test('九寨沟每个湖滩瀑布及三条沟谷均有可读干岸地名牌', () => {
  assert.equal(new Set(JIUZHAIGOU_SIGNPOSTS.map(s => s.id)).size, 15);
  for (const site of [...JIUZHAIGOU_LAKES, ...JIUZHAIGOU_FALLS]) {
    const signs = JIUZHAIGOU_SIGNPOSTS.filter(s => s.id === site.id);
    assert.equal(signs.length, 1, site.name);
    assert.equal(signs[0].zone.name, site.name);
    assert.ok(Math.hypot(signs[0].x - site.x, signs[0].y - site.y) < 500);
  }
  for (const name of ['日则沟', '则查洼沟', '树正沟']) assert.ok(JIUZHAIGOU_SIGNPOSTS.some(s => s.zone.name === name));
  for (const sign of JIUZHAIGOU_SIGNPOSTS) {
    assert.equal(valleyBlocked(sign.x, sign.y, 35), false, sign.zone.name);
    assert.equal(valleyBlocked(sign.x, sign.y + 45, 12), false, `${sign.zone.name} 牌前`);
  }
});

// 从入口对实际干地与树干做保守栅格连通检查，覆盖所有牌前站位，避免密林封死观景点。
test('加密林坡后可步行抵达所有地名牌，主游径没有树干', () => {
  const g = new Game(); g.switchMap('jiuzhaigou');
  const cols = 360, rows = 280, step = 10, pass = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    pass[y * cols + x] = !blocked(x * step, y * step, 17, g.trees, g.player);
  const start = Math.round(JIUZHAIGOU_SPAWN.y / step) * cols + Math.round(JIUZHAIGOU_SPAWN.x / step);
  assert.ok(pass[start]);
  const seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i], x = k % cols, y = Math.floor(k / cols);
    for (const [nx, ny] of [[(x + 1) % cols, y], [(x + cols - 1) % cols, y], [x, (y + 1) % rows], [x, (y + rows - 1) % rows]]) {
      const next = ny * cols + nx;
      if (pass[next] && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  for (const sign of JIUZHAIGOU_SIGNPOSTS) {
    const k = Math.round((sign.y + 45) / step) * cols + Math.round(sign.x / step);
    assert.ok(seen.has(k), `无法步行到达 ${sign.zone.name}`);
  }
  for (const tree of g.trees) {
    assert.ok(valleyPathDistance(tree.x, tree.y) >= 63);
    assert.equal(valleySignClearing(tree.x, tree.y), false);
  }
});

// 外围每组林坡都有地被和树木，不依靠近岸小摆件掩盖大块空白。
test('外围连续林坡有多类林下植被，地被不进入水面和步道', () => {
  assert.deepEqual(new Set(JIUZHAIGOU_UNDERSTORY.map(p => p.kind)), new Set(['stone', 'fern', 'shrub', 'grass']));
  const trees = jiuzhaigouTrees();
  for (const slope of JIUZHAIGOU_SLOPES) {
    const within = p => Math.hypot((p.x - slope.x) / slope.rx, (p.y - slope.y) / slope.ry) < 1;
    assert.ok(trees.filter(within).length > 12);
    assert.ok(JIUZHAIGOU_UNDERSTORY.filter(within).length > 15);
  }
  for (const p of JIUZHAIGOU_UNDERSTORY) {
    assert.equal(valleyBlocked(p.x, p.y, 38), false);
    assert.ok(valleyPathDistance(p.x, p.y) >= 46);
  }
});

test('旧档和非法地图安全回退，合法地图刷新后恢复', () => {
  assert.equal(validateProgress({ version: 1 }).mapId, 'forest');
  assert.equal(validateProgress({ version: 1, mapId: '__proto__' }).mapId, 'forest');
  const g = new Game(); g.start(); g.switchMap('jiuzhaigou'); g.player.hp = 63;
  g.progress.patrol = capturePatrol(g);
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.mapId, 'jiuzhaigou');
  assert.equal(restored.player.mapId, 'jiuzhaigou');
  assert.equal(restored.player.hp, 63);
  assert.equal(restored.state, 'paused');
  assert.equal(blocked(restored.player.x, restored.player.y, 12, restored.trees, restored.player), false);
});

test('旅行保留生命弹药波次和敌人血量，森林树木与停留位置可返回', () => {
  const g = new Game(), original = g.trees;
  g.start(); g.player.hp = 73; g.magazines[0].ammo = 4; g.wave = 5;
  const enemy = spawnEnemy(g); enemy.hp = 19;
  const pos = { x: g.player.x, y: g.player.y }, spawned = g.waveSpawned;
  assert.equal(g.switchMap('jiuzhaigou'), true);
  assert.equal(g.player.hp, 73); assert.equal(g.magazines[0].ammo, 4);
  assert.equal(g.wave, 5); assert.equal(g.waveSpawned, spawned); assert.equal(enemy.hp, 19);
  assert.equal(enemy.mapId, 'jiuzhaigou'); assert.equal(terrainBlocked(enemy.x, enemy.y, 12, enemy.mapId), false);
  const valleyTrees = g.trees; valleyTrees[0].hp = 20;
  assert.equal(g.switchMap('forest'), true);
  assert.equal(g.trees, original); assert.equal(g.player.x, pos.x); assert.equal(g.player.y, pos.y);
  assert.equal(g.switchMap('jiuzhaigou'), true); assert.equal(g.trees, valleyTrees); assert.equal(g.trees[0].hp, 20);
  assert.equal(g.switchMap('missing'), false); assert.equal(g.switchMap('jiuzhaigou'), false);
});

test('湖中心阻挡步行，两栖过湖，瀑坎阻挡两栖，直升机可飞越', () => {
  for (const lake of JIUZHAIGOU_LAKES) {
    assert.equal(valleyTouches(lake, lake.x, lake.y), true);
    assert.equal(blocked(lake.x, lake.y, 12, [], { mapId: 'jiuzhaigou' }), true);
    assert.equal(blocked(lake.x, lake.y, 12, [], { mapId: 'jiuzhaigou', amphibious: true }), false);
    const landing = landingPoint({ ...lake, mapId: 'jiuzhaigou' }, []);
    assert.ok(landing); assert.equal(valleyBlocked(landing.x, landing.y), false);
  }
  for (const f of JIUZHAIGOU_FALLS) assert.equal(blocked(f.x, f.y + 10, 12, [], { mapId: 'jiuzhaigou', amphibious: true }), true);
  const lake = JIUZHAIGOU_LAKES[0], bird = { x: lake.x, y: lake.y, flying: true, mapId: 'jiuzhaigou' };
  moveBody(bird, 30, 20); assert.equal(bird.x, lake.x + 30);
  assert.equal(valleyBlocked(lake.x + 3600, lake.y - 2800), true);
});

test('湖岸植被不会长入水中，地面移动与绕行使用所选地图', () => {
  const trees = jiuzhaigouTrees(); assert.ok(trees.length > 100);
  assert.ok(trees.some(t => t.variant === 'pine')); assert.ok(trees.some(t => t.variant === 'birch'));
  for (const t of trees) assert.equal(valleyBlocked(t.x, t.y, 30), false);
  const a = { x: 580, y: 640, mapId: 'jiuzhaigou' }, b = { x: 1430, y: 640 };
  assert.equal(terrainLineClear(a, b), false);
  const goal = naturalWaypoint(a, b);
  assert.ok(Math.hypot(goal.x - a.x, goal.y - a.y) > 1);
  assert.equal(terrainLineClear(a, goal), true);
  const dry = nearestDryTerrain({ x: 1010, y: 640, mapId: 'jiuzhaigou' });
  assert.equal(valleyBlocked(dry.x, dry.y), false);
});

test('多个游戏实例的地形不串线，九寨沟外围刷怪落在本地图干地', () => {
  const forest = new Game(), valley = new Game(); valley.switchMap('jiuzhaigou'); valley.start();
  const oldLake = NATURAL_TERRAIN.lakes[0];
  assert.equal(blocked(oldLake.x, oldLake.y, 12, [], forest.player), true);
  assert.equal(forest.mapId, 'forest');
  let count = 0;
  for (let i = 0; i < 20; i++) {
    const spot = findArrivalSpot(valley);
    if (!spot) continue;
    const e = spawnEnemy(valley, 0, 500, spot);
    assert.equal(e.mapId, 'jiuzhaigou'); assert.equal(valleyBlocked(e.x, e.y, 28), false); count++;
  }
  assert.ok(count > 0);
});

test('领主死亡秘境限制在逻辑层执行，秘境退出与秘境读档恢复九寨沟', () => {
  const g = new Game(); g.switchMap('jiuzhaigou'); g.start();
  g.boss = {}; assert.equal(g.switchMap('forest'), false); g.boss = null;
  g.state = 'dead'; assert.equal(g.switchMap('forest'), false); g.state = 'playing';
  assert.equal(enterRealm(g, 'tower'), true); assert.equal(g.mapId, 'forest');
  assert.equal(g.progress.mapId, 'jiuzhaigou'); assert.equal(g.switchMap('forest'), false);
  const saved = JSON.parse(JSON.stringify(g.progress));
  leaveRealm(g); assert.equal(g.mapId, 'jiuzhaigou'); assert.equal(g.player.mapId, 'jiuzhaigou');
  const restored = new Game(saved); assert.equal(restored.mapId, 'forest');
  leaveRealm(restored); assert.equal(restored.mapId, 'jiuzhaigou');
  restored.resetProgress(); assert.equal(restored.mapId, 'forest');
});

test('九寨沟真实战斗推进刷怪、走位与追击，静态路线缓存不污染森林', () => {
  const g = new Game(undefined, () => .42); g.switchMap('jiuzhaigou'); g.start(); g.setViewport(390, 844);
  for (let i = 0; i < 240; i++) {
    g.player.invincible = 1;
    g.update(1 / 30, { x: Math.cos(i / 40), y: Math.sin(i / 40) });
    assert.equal(valleyBlocked(g.player.x, g.player.y, 12), false);
  }
  assert.ok(g.enemies.length > 0);
  assert.ok(g.enemies.every(e => e.mapId === 'jiuzhaigou' && Number.isFinite(e.x) && Number.isFinite(e.y)));
  g.switchMap('forest'); g.update(1 / 30);
  assert.equal(g.player.mapId, 'forest');
  assert.ok(g.enemies.every(e => e.mapId === 'forest'));
});
