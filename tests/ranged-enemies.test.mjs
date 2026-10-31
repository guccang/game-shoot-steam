// 远程出生比例、节奏、打断、扫掠遮挡与场景隔离使用正式游戏及战斗入口验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { rangedSpawn, rangedSpecies, RANGED_ENEMIES, RANGED_LIMITS } from '../src/config/ranged-enemies.js';
import { updateRangedAttack, updateEnemyBolts } from '../src/combat/ranged-enemies.js';
import { updateEnemies } from '../src/core/enemy-manager.js';
import { applyImpulse } from '../src/physics/motion.js';
import { viewBody } from '../src/world/coordinates.js';
import { drawEnemyBolts } from '../src/rendering/ranged-enemies.js';

// 独立干地夹具禁止随机增援与玩家自动射击，保留真正的怪物和承伤路径。
function arena() {
  const g = new Game(freshProgress(), () => .5); g.start(); g.trees = []; g.enemies = [];
  g.updateWaves = () => {}; g.attack = () => {}; g.updateWeaponAbility = () => {};
  Object.assign(g.player, { x: 900, y: 700, arena: { x: 900, y: 700, radius: 800 } });
  return g;
}

// 只指定需要测试的种类，属性、状态、物理与伤害依然使用正式怪物对象。
function shooter(g, species = 'spore-spitter', x = 1050, y = 700) {
  const e = g.spawnEnemy(0, 0, { x, y });
  Object.assign(e, { species, hp: 1000, maxHp: 1000, damage: 9, speed: 50, flying: false, arena: g.player.arena });
  return e;
}

// 固定小步推进正式敌人批次，避免手写状态机替代实际攻击。
function tick(g, seconds) { for (let i = 0; i < Math.ceil(seconds * 60); i++) updateEnemies(g, 1 / 60, g.player); }

// 渲染代理跨环面后，炮弹落点圈不能留在另一张地图上。
test('重炮飞行中的预警与弹丸使用同侧世界镜像',()=>{
  const circles=[],c=new Proxy({ellipse:(...args)=>circles.push(args)},{get:(target,key)=>target[key]||(()=>{})});
  drawEnemyBolts(c,[viewBody({species:'stump-bombard',x:3590,y:700,endX:3560,endY:700,splash:45,dx:-1,dy:0,age:.2},{x:10,y:700})]);
  assert.deepEqual(circles[0].slice(0,4),[-40,700,45,45]);
});

// 机械伙伴也使用同一落点伤害，不复制玩家扣血或触发无敌时间。
test('重炮范围可伤害机械伙伴，圈外伙伴不受伤',()=>{
  const g=arena(),e=shooter(g,'stump-bombard');
  const nodes=[{x:910,y:700,hp:100,active:true,ready:true},{x:960,y:700,hp:100,active:true,ready:true}];
  updateRangedAttack(g,e,g.player,.01);updateRangedAttack(g,e,g.player,1.21);g.player.y+=80;
  updateEnemyBolts(g,2,g.player,nodes.map(node=>({node,source:g})));
  assert.equal(nodes[0].hp,91);assert.equal(nodes[1].hp,100);assert.equal(g.player.hp,g.maxHp());
});

// 通过真实命中验证提升，而非仅检查配置。
test('旧远程能从300距离开火，10秒内至少命中三次',()=>{
  for(const species of ['spore-spitter','acorn-slinger']){
    const g=arena();shooter(g,species,1200,700);let hits=0;g.hurt=()=>{hits++;};
    tick(g,10);assert.ok(hits>=3,`${species}: ${hits}`);
  }
});

// 落点圈对应伤害半径，树干挡弹且一次爆炸只结算一次。
test('重炮落点爆炸、边缘衰减、掩体遮挡与单次结算',()=>{
  for(const [offset,blocked,expected] of [[0,false,9],[35,false,5.85],[55,false,0],[0,true,0]]){
    const g=arena(),e=shooter(g,'stump-bombard');let damage=0;g.hurt=value=>{damage+=value;};
    updateRangedAttack(g,e,g.player,.01);updateRangedAttack(g,e,g.player,1.21);
    g.player.y+=offset;if(blocked)g.trees=[{x:980,y:692,radius:18,hp:100}];
    updateEnemyBolts(g,2,g.player);updateEnemyBolts(g,2,g.player);
    assert.ok(Math.abs(damage-expected)<1e-8);assert.equal(g.enemyBolts.length,0);
  }
});

// 空隙繁忙时保留已完成的瞄准，避免白白消耗恢复期。
test('蓄满后等待共享空隙，下一空隙发射',()=>{
  const g=arena(),a=shooter(g),b=shooter(g,'reed-archer',1050,730);
  updateRangedAttack(g,a,g.player,.01);updateRangedAttack(g,b,g.player,.01);
  updateRangedAttack(g,a,g.player,1);updateRangedAttack(g,b,g.player,1);
  assert.equal(b.assault.phase,'windup');assert.equal(g.enemyBolts.length,1);
  updateEnemyBolts(g,.33,g.player);updateRangedAttack(g,b,g.player,.01);
  assert.equal(b.assault.phase,'recovery');assert.equal(g.enemyBolts.length,2);
});

// 实际怪物工厂覆盖所有新物种，脚本居民遭遇仍维持原规则。
test('弩手、装甲车和重炮分段解锁，不增加波次总数',()=>{
  assert.equal(rangedSpecies(2,.999),'reed-archer');assert.equal(rangedSpecies(4,.999),'bramble-buggy');assert.equal(rangedSpecies(6,.999),'stump-bombard');
  const seen=new Set();for(const [wave,ordinal,roll] of [[2,8,.01],[2,8,.4],[2,8,.99],[3,4,0],[5,4,0]]){
    const g=arena();g.wave=wave;g.waveSpawned=ordinal-1;g.random=()=>roll;
    const e=g.spawnEnemy(0,0,{x:1100,y:700});seen.add(e.species);assert.equal(g.waveSpawned,ordinal);
    assert.ok(!RANGED_ENEMIES[g.spawnEnemy(0,0,{x:1100,y:700},{ambient:true}).species]);
  }
  assert.deepEqual([...seen].sort(),Object.keys(RANGED_ENEMIES).sort());
});

test('第一波无远程，抽签概率低于近战，名额间距和存活上限不可被极端随机绕过', () => {
  const guards = Array.from({ length: 30 }, () => ({ hp: 100, species: 'slime' }));
  for (const wave of [1, 2, 3, 6, 100]) {
    let count = 0;
    for (let ordinal = 1; ordinal <= 100; ordinal++) for (let i = 0; i < 100; i++)
      count += Number(rangedSpawn(wave, ordinal, i / 100, guards));
    assert.equal(count, wave < 2 ? 0 : wave < 6 ? 2805 : 3135);
  }
  assert.equal(rangedSpawn(10, 5, 0, guards.slice(0, 3)), true);
  assert.equal(rangedSpawn(10, 5, 0, [...guards, ...Array.from({ length: 6 }, () => ({ hp: 1, species: 'spore-spitter' }))]), false);
  assert.equal(rangedSpawn(10, 5, 0, guards, true), false);
  const g = arena(); g.wave = 20; g.random = () => 0;
  for (let i = 0; i < 80; i++) g.spawnEnemy(i, 300);
  const ranged = g.enemies.filter(e => RANGED_ENEMIES[e.species]);
  assert.equal(ranged.length, 6); assert.equal(g.waveSpawned, 80);
  assert.ok(ranged.every(e => !e.flying));
});

test('五类远程蓄力后只发一颗弹且锁定旧位置，不追踪移动玩家', () => {
  for (const species of Object.keys(RANGED_ENEMIES)) {
    const g = arena(), e = shooter(g, species), p = RANGED_ENEMIES[species];
    updateRangedAttack(g, e, g.player, .01);
    assert.equal(e.assault.phase, 'windup'); const direction = [e.assault.dirX, e.assault.dirY];
    updateRangedAttack(g, e, g.player, p.windup - .01); assert.equal(g.enemyBolts.length, 0);
    g.player.y += 90; updateRangedAttack(g, e, g.player, .02);
    assert.equal(g.enemyBolts.length, 1); assert.deepEqual([g.enemyBolts[0].dx, g.enemyBolts[0].dy], direction);
    assert.equal(g.enemyBolts[0].speed, p.speed); assert.equal(e.assault.phase, 'recovery');
    tick(g, 2); assert.equal(g.player.hp, g.maxHp());
  }
});

test('正式敌人批次射击可命中，单弹伤害一次且长恢复期无持续伤害', () => {
  const g = arena(), e = shooter(g), hp = g.player.hp;
  tick(g, 2); assert.equal(g.player.hp, hp - e.damage); assert.equal(g.enemyBolts.length, 0);
  tick(g, 1); assert.equal(g.player.hp, hp - e.damage);
});

test('真实击退打断前摇，击杀清理在途弹，取消不会留下伤害区', () => {
  const g = arena(), e = shooter(g); updateRangedAttack(g, e, g.player, .01);
  applyImpulse(e, { x: 1, y: 0 }, 100); updateRangedAttack(g, e, g.player, 1);
  assert.equal(e.assault.phase, 'recovery'); assert.equal(g.enemyBolts.length, 0);
  e.knockTime = 0; e.assault.phase = 'chase'; updateRangedAttack(g, e, g.player, .01);
  updateRangedAttack(g, e, g.player, 1); assert.equal(g.enemyBolts.length, 1);
  e.hp = 0; updateEnemyBolts(g, .1, g.player); assert.equal(g.enemyBolts.length, 0);
});

test('共享间隔和弹量硬上限抑制齐射，领主期间仅一弹', () => {
  for (const boss of [null, { id: 999 }]) {
    const g = arena(); g.boss = boss;
    const group = [shooter(g), shooter(g, 'acorn-slinger', 1050, 730), shooter(g, 'spore-spitter', 1050, 670)];
    for (const e of group) updateRangedAttack(g, e, g.player, .01);
    for (const e of group) updateRangedAttack(g, e, g.player, 2);
    assert.equal(g.enemyBolts.length, 1); assert.equal(g.rangedShotTimer, boss ? RANGED_LIMITS.bossShotGap : RANGED_LIMITS.shotGap);
    const cap = boss ? 1 : RANGED_LIMITS.bolts; while (g.enemyBolts.length < cap) g.enemyBolts.push({ ...g.enemyBolts[0] });
    g.rangedShotTimer = 0; group[0].assault.phase = 'chase'; updateRangedAttack(g, group[0], g.player, .1);
    assert.equal(group[0].assault.phase, 'chase'); assert.equal(g.enemyBolts.length, cap);
    if (!boss) {
      g.boss = { id: 999 }; updateEnemyBolts(g, .01, g.player);
      assert.ok(g.enemyBolts.length <= 1, '领主出现立即压低已有普通弹量');
    }
  }
});

test('树干拦弹不受伤，高步长与环面扫掠仍只命中一次', () => {
  const g = arena(), e = shooter(g); updateRangedAttack(g, e, g.player, .01); updateRangedAttack(g, e, g.player, 1);
  g.trees = [{ x: 980, y: 700, radius: 18, hp: 50 }];
  updateEnemyBolts(g, 1, g.player); assert.equal(g.player.hp, g.maxHp()); assert.equal(g.trees[0].hp, 50); assert.equal(g.enemyBolts.length, 0);
  g.trees = []; g.player.x = 3590; g.player.invincible = 0;
  g.enemyBolts.push({ owner: e.id, x: 50, y: 700, dx: -1, dy: 0, speed: 150, radius: 7, remaining: 300, damage: 9, age: 0 });
  updateEnemyBolts(g, 1, g.player); assert.equal(g.player.hp, g.maxHp() - 9); assert.equal(g.enemyBolts.length, 0);
});

test('画外不蓄力，暂停不推进；秘境和领主援军不混入新远程', () => {
  const g = arena(), e = shooter(g); g.arrivalView = { left: -100, right: 100, top: -300, bottom: 300 };
  updateRangedAttack(g, e, g.player, .1); assert.equal(e.assault.phase, 'chase'); assert.ok(e.x < 1050);
  g.arrivalView = null; updateRangedAttack(g, e, g.player, .1); const old = e.assault.elapsed; g.state = 'paused'; g.update(1); assert.equal(e.assault.elapsed, old);
  g.state = 'playing'; g.enemies = []; g.wave = 20; g.random = () => 0;
  for (let i = 0; i < 30; i++) g.spawnEnemy(0, 0, { x: 1000 + i * 20, y: 900 }, { bossOwner: 999 });
  assert.ok(g.enemies.every(e => !RANGED_ENEMIES[e.species]));
  g.enterRealm('football'); for (let i = 0; i < 30; i++) g.spawnEnemy(0, 100);
  assert.ok(g.enemies.every(e => !RANGED_ENEMIES[e.species]));
});

test('秘境现场冻结恢复慢弹，旅行与重建清空新瞬态且旧档兼容', () => {
  const g = arena(), e = shooter(g); updateRangedAttack(g, e, g.player, .01); updateRangedAttack(g, e, g.player, 1);
  const bolts = g.enemyBolts, timer = g.rangedShotTimer; g.enterRealm('football');
  assert.equal(g.enemyBolts.length, 0); g.leaveRealm(); assert.equal(g.enemyBolts, bolts); assert.equal(g.rangedShotTimer, timer);
  assert.equal(g.switchMap('jiuzhaigou'), true); assert.equal(g.enemyBolts.length, 0); assert.equal(g.rangedShotTimer, 0);
  g.reset(); assert.equal(g.enemyBolts.length, 0); assert.equal(g.rangedShotTimer, 0);
});
