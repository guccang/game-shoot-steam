// 非强制提示、载具电锯交易与飞行近战完整周期的回归验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import { BossHint } from '../src/ui/boss-hint.js';
import { Game, freshProgress, validateProgress, WORLD } from '../src/game.js';
import { WEAPONS } from '../src/config/weapons.js';
import { vehicleWeaponCost } from '../src/config/vehicles.js';
import { transactVehicle } from '../src/progression/vehicles/vehicles.js';
import { createEnemyAttack, updateEnemyAttack, attackProfile } from '../src/combat/enemy-attack.js';
import { riverXAt, isWaterBlocked } from '../src/world/river-geometry.js';
import { applyImpulse, stepBodies } from '../src/physics/motion.js';
import { traceTargets } from '../src/combat/collision.js';
import { worldDistance } from '../src/world/coordinates.js';
const SAW = WEAPONS.findIndex(w => w.id === 'chainsaw');

test('领主就绪提示仅显示2.4秒，不随HUD刷新重复触发，下一轮可再次显示', () => {
  let time = 0;
  const hint = new BossHint(() => time), status = { available: true, key: '0:0', playing: true };
  assert.equal(hint.update({ ...status, available: false }), false);
  assert.equal(hint.update(status), true);
  time = 2399; assert.equal(hint.update(status), true);
  time = 2400; assert.equal(hint.update(status), false);
  time = 6000; assert.equal(hint.update(status), false);
  assert.equal(hint.update({ ...status, key: '12:1' }), true);
});

test('未开局提示等待开始，点击挑战、暂停及打开面板会收起且不反复提示', () => {
  const hint = new BossHint(() => 0), status = { available: true, key: '0:0', playing: true };
  assert.equal(hint.update({ ...status, playing: false }), false);
  assert.equal(hint.update(status), true);
  assert.equal(hint.update({ ...status, playing: false }), false);
  assert.equal(hint.update(status), false);
  assert.equal(hint.update({ ...status, available: false }), false);
  assert.equal(hint.update(status), true);
});

test('载具电锯独立提高到1800金币600木材，旧价格不足，手持及库存不变', () => {
  const p = freshProgress();
  assert.deepEqual(vehicleWeaponCost(SAW), { coins: 1800, wood: 600 });
  assert.equal(WEAPONS[SAW].coins, 120);
  assert.equal(WEAPONS[SAW].wood, 40);
  p.coins = 120; p.wood = 40;
  const before = JSON.stringify(p);
  assert.equal(transactVehicle(p, 'turret', SAW, 'buy'), false);
  assert.equal(JSON.stringify(p), before);
  p.materials = { parts: 35, crystal: 0, core: 1 };
  p.coins = 1800; p.wood = 599;
  assert.equal(transactVehicle(p, 'turret', SAW, 'buy'), false);
  p.wood = 600;
  assert.equal(transactVehicle(p, 'turret', SAW, 'buy'), true);
  assert.equal(p.coins, 0); assert.equal(p.wood, 0);
  assert.equal(transactVehicle(p, 'turret', SAW, 'buy'), false);
  const restored = validateProgress(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.vehicleWeapons[SAW], 1);
  assert.equal(restored.weapons[SAW], 0);
});

test('飞行怪占原有波次名额，前两波步战没有飞行怪，第三波及直升机混入少量', () => {
  for (const [wave, flying, expected] of [[1, false, 0], [2, false, 0], [3, false, 2], [6, false, 3], [1, true, 3]]) {
    const g = new Game(freshProgress(), () => 0.5);
    g.start(); g.enemies = []; g.waveSpawned = 0; g.wave = wave; g.player.flying = flying;
    for (let i = 0; i < 12; i++) g.spawnEnemy(i, 200);
    const bats = g.enemies.filter(e => e.flying);
    assert.equal(bats.length, expected);
    assert.equal(g.waveSpawned, 12); assert.equal(g.enemies.length, 12);
    assert.ok(bats.every(e => e.species === 'leaf-bat' && e.name.startsWith('叶翼蝠')));
  }
});

// 构造河道上空的飞行怪；使用真实状态机验证前摇、命中、回位与躲避。
function flyingArena() {
  const p = { x: riverXAt(1100), y: 1100, flying: true };
  const e = { id: 3, type: 'enemy', species: 'leaf-bat', flying: true, x: p.x - 80, y: p.y,
    hp: 100, maxHp: 100, damage: 7, radius: 17, speed: 80, assault: createEnemyAttack() };
  updateEnemyAttack(e, p, p, 0.01, WORLD);
  return { e, p };
}

// 小步推进固定攻击轨迹，返回所有伤害以验证一扑只命中一次。
function attackAdvance(e, p, seconds) {
  let damage = 0, remaining = seconds;
  while (remaining > 1e-8) {
    const dt = Math.min(1 / 120, remaining);
    damage += updateEnemyAttack(e, p, p, dt, WORLD);
    remaining -= dt;
  }
  return damage;
}

test('叶翼蝠可越河攻击，前摇停步且固定落点，一次扑击只伤害一次并精确回位', () => {
  const { e, p } = flyingArena(), profile = attackProfile(e), origin = { x: e.x, y: e.y };
  assert.equal(e.assault.phase, 'windup');
  assert.equal(attackAdvance(e, p, profile.windup), 0);
  assert.ok(worldDistance(e, origin) < 0.001);
  assert.equal(attackAdvance(e, p, profile.lunge), 7);
  assert.equal(isWaterBlocked(e.x, e.y, 12), true);
  assert.equal(attackAdvance(e, p, profile.returning), 0);
  assert.ok(worldDistance(e, origin) < 0.001);
  assert.equal(e.assault.phase, 'recovery');
});

test('横移能躲避飞行扑击，空中怪也可攻击步战角色，地图接缝不拉长轨迹', () => {
  const { e, p } = flyingArena(), end = { x: e.assault.endX, y: e.assault.endY };
  p.y += 150;
  assert.equal(attackAdvance(e, p, 1.5), 0);
  assert.deepEqual({ x: e.assault.endX, y: e.assault.endY }, end);
  for (const flying of [false, true]) {
    const target = { x: 15, y: 1200, flying };
    const bat = { ...e, x: WORLD.width - 65, y: 1200, assault: createEnemyAttack() };
    updateEnemyAttack(bat, target, target, 0.01, WORLD);
    assert.ok(Math.abs(bat.assault.endX - bat.x) < 100);
    assert.equal(attackAdvance(bat, target, 0.84), 7);
  }
});

test('空地碰撞分层，飞行怪之间仍能连锁击退且子弹可命中', () => {
  const { e } = flyingArena();
  e.x = 800; e.y = 1100; e.assault = createEnemyAttack();
  const ground = { ...e, id: 5, flying: false, x: 815 };
  stepBodies([e, ground], 0.01, WORLD);
  assert.equal(e.x, 800); assert.equal(ground.x, 815);
  const b = { ...e, id: 6, x: 850, assault: createEnemyAttack() };
  applyImpulse(e, { x: 1, y: 0 }, 90);
  for (let i = 0; i < 12; i++) stepBodies([e, b], 0.01, WORLD);
  assert.ok(b.pushX > 0 && b.knockTime > 0);
  const hits = traceTargets({ x: b.x - 100, y: b.y - 8 }, { x: b.x + 100, y: b.y - 8 }, [b]);
  assert.equal(hits[0].target, b);
});

test('真实直升机装甲承受飞行扑击，暂停冻结且击杀仍只结算一次', () => {
  const p = freshProgress(); p.vehicleHulls[2] = 1; p.vehicleIndex = 2;
  const g = new Game(p, () => 0.5);
  g.start(); g.summonVehicle();
  g.player.x = riverXAt(1100); g.player.y = 1100;
  g.enemies = []; g.trees = []; g.updateWaves = () => {}; g.attackTimer = 999;
  g.waveSpawned = 3; const e = g.spawnEnemy(Math.PI, 80);
  // 本场只验扑击承伤，冻结随车新增火神炮以免先击退攻击者。
  g.vehicle.module.magazine.ammo=0;g.vehicle.module.magazine.remaining=100;
  const hp = g.player.hp, armor = g.vehicle.hp;
  g.update(0.01); g.pause();
  const old = structuredClone(e);
  g.update(0.05); assert.deepEqual(e, old); g.pause();
  for (let i = 0; i < 100; i++) g.update(0.01);
  assert.equal(g.player.hp, hp); assert.ok(g.vehicle.hp < armor);
  const kills = g.kills;
  g.hit(e, 10000); g.hit(e, 10000);
  assert.equal(g.kills, kills + 1);
});
