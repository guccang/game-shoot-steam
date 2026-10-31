import {summonBossAtNode} from './helpers/boss-node.mjs';
// 五种领主轮换、真实状态机与危险区几何回归，不依赖画面驱动战斗。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { BOSSES, nextBoss } from '../src/config/bosses.js';
import { bossSweep } from '../src/combat/bosses.js';
import { isWaterBlocked, riverXAt } from '../src/world/river-geometry.js';
import { WORLD } from '../src/world/coordinates.js';
// 保留生产移动、伤害、状态计时，只隔离普通刷怪与自动开火。
function arena(index) {
  const p = freshProgress();
  p.bosses = index;
  p.heroes[0] = 20;
  const g = new Game(p, () => 0.5);
  g.start();
  g.trees = [];
  g.enemies = [];
  g.updateWaves = () => {};
  g.attackTimer = 999;
  g.player.x = 1000;
  g.player.y = 700;
  g.kills = 12;
  assert.ok(summonBossAtNode(g));
  Object.assign(g.boss, { x: 800, y: 700, speed: 0, hp: 1e6, maxHp: 1e6, attack: 0 });
  return g;
}
// 使用小步长推进真正的游戏循环，避免跨过前摇和命中边界。
function advance(g, seconds, input = { x: 0, y: 0 }) {
  for (let t = 0; t < seconds - 1e-8; t += 0.01) g.update(Math.min(0.01, seconds - t), input);
}
test('四个新形象与原巨兽五场不重复，旧档累计胜场驱动下一轮', () => {
  const g = arena(0),
    ids = [];
  for (let i = 0; i < 10; i++) {
    if (i) {
      g.kills += 12;
      assert.ok(summonBossAtNode(g));
    }
    ids.push(g.boss.kind);
    const b = g.boss,
      coins = g.progress.coins;
    g.hit(b, 2e6);
    g.hit(b, 2e6);
    assert.equal(g.progress.coins, coins + 180);
    assert.equal(g.progress.bosses, i + 1);
    assert.equal(g.boss, null);
  }
  assert.deepEqual(
    ids.slice(0, 5),
    BOSSES.map((b) => b.id),
  );
  assert.deepEqual(ids.slice(5), ids.slice(0, 5));
  const saved = validateProgress(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(nextBoss(saved).id, 'boar');
});
test('每种领主前摇固定落点且不伤人，站在有效区域会中招', () => {
  for (let index = 0; index < 5; index++) {
    const g = arena(index),
      hp = g.player.hp;
    g.update(0.01);
    const areas = JSON.stringify(g.hazards.map((h) => [h.x, h.y, h.dx, h.dy]));
    advance(g, BOSSES[index].windup - 0.05);
    assert.equal(g.player.hp, hp, BOSSES[index].id + '前摇伤害');
    assert.equal(JSON.stringify(g.hazards.map((h) => [h.x, h.y, h.dx, h.dy])), areas);
    advance(g, 1.5);
    assert.ok(g.player.hp < hp, BOSSES[index].id + '没有命中');
  }
});
test('横移、离开孢子落点、羽刃间隙和震波内圈均能避开技能', () => {
  for (let index = 0; index < 5; index++) {
    const g = arena(index),
      hp = g.player.hp;
    g.update(0.01);
    if (index === 2) {
      g.player.x = 800 + Math.cos(0.19) * 250;
      g.player.y = 700 + Math.sin(0.19) * 250;
    } else if (index === 3) {
      g.player.x = 800;
      g.player.y = 700;
    } else {
      g.player.y += 150;
    }
    advance(g, BOSSES[index].windup + BOSSES[index].active + 0.05);
    assert.equal(g.player.hp, hp, BOSSES[index].id + '躲避后仍伤害');
  }
});
test('野猪锁定后不转弯，精确结束冲锋并保留反击硬直', () => {
  const g = arena(0);
  g.update(0.01);
  const b = g.boss,
    origin = { x: b.x, y: b.y },
    length = b.ai.length;
  g.player.y += 180;
  advance(g, BOSSES[0].windup + BOSSES[0].active + 0.05);
  assert.equal(b.ai.phase, 'recover');
  assert.ok(Math.abs(b.x - origin.x - length) < 1e-5);
  assert.equal(b.y, origin.y);
  const x = b.x;
  advance(g, 0.8);
  assert.equal(b.x, x);
  assert.equal(b.ai.phase, 'recover');
});
// 检查短、中、远距离施法均使用更长的同一条预警路线，冲刺结束不超冲。
test('野猪延长冲刺至 340–620 单位，预警、实际终点与配置一致', () => {
  for (const [distance, expected] of [[60, 340], [200, 440], [395, 620]]) {
    const g = arena(0), b = g.boss;
    // 使用河流东侧开阔地，避免把合理的河岸截断误认为距离不足。
    b.x = 1600;
    const origin = b.x;
    g.player.x = b.x + distance;
    g.update(0.01);
    const lane = g.hazards.find(h => h.kind === 'charge');
    assert.equal(lane.length, expected);
    assert.equal(b.ai.length, expected);
    assert.equal(lane.warmup, 1);
    assert.equal(lane.duration, 1.1);
    g.player.y += 180;
    const hp = g.player.hp;
    advance(g, BOSSES[0].windup + BOSSES[0].active + 0.03);
    assert.equal(b.ai.phase, 'recover');
    assert.ok(Math.abs(b.x - origin - expected) < 1e-5);
    assert.equal(g.player.hp, hp);
  }
});
test('羽刃扫掠不漏高速目标且震波一次命中不逐帧扣血', () => {
  assert.ok(bossSweep({ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 250, y: 0 }, { x: 250, y: 0 }, 10));
  assert.ok(!bossSweep({ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 250, y: 80 }, { x: 250, y: 80 }, 10));
  for (const index of [0, 2, 3]) {
    const g = arena(index),
      hits = [];
    g.hurt = (d) => hits.push(d);
    advance(g, 3);
    assert.equal(hits.length, 1, BOSSES[index].id + '重复命中');
  }
  const g = arena(1),
    hits = [];
  g.hurt = (d) => hits.push(d);
  advance(g, 3.7);
  assert.equal(hits.length, 3);
});
test('暂停与死亡冻结领主和危险区，击杀或重新出发清理所有技能', () => {
  for (let i = 0; i < 5; i++) {
    const g = arena(i);
    advance(g, 0.4);
    g.pause();
    const before = JSON.stringify([g.boss, g.hazards]);
    advance(g, 2);
    assert.equal(JSON.stringify([g.boss, g.hazards]), before);
    g.pause();
    g.hit(g.boss, 2e6);
    assert.equal(g.hazards.length, 0);
    assert.equal(g.boss, null);
    g.kills += 12;
    summonBossAtNode(g);
    g.boss.attack = 0;
    g.boss.x = g.player.x + 150;
    advance(g, 0.1);
    g.player.invincible = 0;
    g.hurt(1e9);
    const dead = JSON.stringify([g.boss, g.hazards]);
    advance(g, 2);
    assert.equal(JSON.stringify([g.boss, g.hazards]), dead);
    g.start();
    assert.equal(g.boss, null);
    assert.equal(g.hazards.length, 0);
  }
});
test('循环地图接缝两侧仍正确命中，路径预警不会横跨整张地图', () => {
  for (let i = 0; i < 4; i++) {
    const g = arena(i);
    g.boss.x = WORLD.width - 90;
    g.player.x = 50;
    const hp = g.player.hp;
    g.update(0.01);
    assert.ok(g.hazards.every((h) => !h.length || h.length <= 420));
    advance(g, 2.7);
    assert.ok(g.player.hp < hp, BOSSES[i].id);
  }
});
test('野猪不能隔河冲锋，沿原有桥梁导航绕行', () => {
  const g = arena(0),
    x = riverXAt(1000);
  g.boss.x = x - 75;
  g.boss.y = 1000;
  g.boss.speed = 42;
  g.player.x = x + 75;
  g.player.y = 1000;
  advance(g, 1);
  assert.equal(g.hazards.length, 0);
  assert.ok(g.boss.y < 1000);
  assert.equal(isWaterBlocked(g.boss.x, g.boss.y), false);
});
test('技能伤害先扣战车耐久，领主存活时危险区最终回收且有数量上限', () => {
  const g = arena(2);
  g.summonVehicle();
  if (g.vehicle.module) g.vehicle.module.cooldown = 999;
  const hp = g.player.hp,
    armor = g.vehicle.hp;
  advance(g, 2.6);
  assert.equal(g.player.hp, hp);
  assert.ok(g.vehicle.hp < armor);
  g.boss.attack = 999;
  advance(g, 3);
  assert.equal(g.hazards.length, 0);
  const h = arena(1);
  h.player.invincible = 999;
  for (let i = 0; i < 1000; i++) {
    h.update(0.05);
    assert.ok(h.hazards.length <= 24);
  }
});
// 不瞬移、不修改移速，使用正常移动输入完成每种前摇的躲避。
test('正常走位速度足够躲开四种新技能',()=>{
 for(let index=0;index<4;index++){
  const g=arena(index),hp=g.player.hp;g.update(.01);
  if(index===2)advance(g,.3,{x:0,y:1});
  else if(index===3)advance(g,.6,{x:1,y:0});
  else advance(g,.8,{x:0,y:1});
  advance(g,3.1);
  assert.equal(g.player.hp,hp,BOSSES[index].id+'正常走位无法避开');
 }
});
