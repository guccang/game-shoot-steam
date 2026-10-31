// 不可达地形下的退让与恢复：验证真实位移、伤害、循环接缝和攻击能力差异。
import test from 'node:test';
import assert from 'node:assert/strict';
import { updateEnemyAttack, createEnemyAttack } from '../src/combat/enemy-attack.js';
import { NATURAL_TERRAIN } from '../src/world/natural-terrain.js';
import { terrainBlocked, nearestDryTerrain } from '../src/physics/terrain-navigation.js';
import { riverXAt } from '../src/world/river-geometry.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';
import { Game, freshProgress } from '../src/game.js';
import { playerThreatRange } from '../src/combat/threat-range.js';

// 测试单位使用正式攻击状态机，拒绝把坐标直接改成规划目的地。
function enemyAt(x, y) {
  return { id: 3, type: 'enemy', x, y, hp: 1000, speed: 100, radius: 17, assault: createEnemyAttack() };
}
// 连续模拟并检查每帧不能为了退让穿进河流、湖泊或山体。
function advance(enemy, target, seconds, range = 320) {
  let damage = 0;
  for (let i = 0; i < seconds * 60; i++) {
    damage += updateEnemyAttack(enemy, target, target, 1 / 60, WORLD, range);
    if (!enemy.flying) assert.equal(terrainBlocked(enemy.x, enemy.y), false);
  }
  return damage;
}

test('湖心与山体目标不吸引地面怪靠近，射程内怪物主动撤出', () => {
  for (const terrain of [NATURAL_TERRAIN.lakes[0], NATURAL_TERRAIN.mountains[0]]) {
    // 不依赖飞行标识，异常站位也不能诱导怪物贴边送死。
    const target = { x: terrain.x, y: terrain.y };
    const dry = nearestDryTerrain(target, { x: target.x - 500, y: target.y });
    const enemy = enemyAt(dry.x, dry.y), start = worldDistance(enemy, target);
    assert.equal(advance(enemy, target, 10, 460), 0);
    assert.ok(worldDistance(enemy, target) > start + 80);
    assert.ok(worldDistance(enemy, target) >= 460 + 48);
    const settled = { x: enemy.x, y: enemy.y }; advance(enemy, target, 2, 460);
    assert.ok(worldDistance(enemy, settled) < 0.01);
  }
});

test('远处怪物不主动靠岸，接缝退让保持本岸，上岸后恢复真实攻击', () => {
  for (const shift of [0, WORLD.width, -WORLD.width]) {
    const target = { x: riverXAt(1100) + shift, y: 1100, amphibious: true };
    const far = enemyAt(target.x - 650, target.y), initial = { ...far };
    advance(far, target, 2); assert.equal(worldDistance(far, initial), 0);
    const near = enemyAt(target.x - 150, target.y);
    assert.equal(advance(near, target, 8), 0);
    assert.ok(worldDistance(near, target) > 380);
    Object.assign(target, { x: near.x + 60, y: near.y, amphibious: false });
    assert.ok(advance(near, target, 2) > 0); assert.equal(near.groundPursuit, undefined);
  }
});

test('飞行怪仍能越水伤害，秘境单位不误读森林地形', () => {
  const target = { x: riverXAt(1100), y: 1100, flying: true };
  const flying = enemyAt(target.x - 60, target.y); flying.flying = true;
  assert.ok(advance(flying, target, 2) > 0);
  const enemy = enemyAt(target.x - 60, target.y); enemy.arena = { x: target.x, y: target.y, radius: 300 };
  let damage = 0;
  for (let i = 0; i < 120; i++) damage += updateEnemyAttack(enemy, target, target, 1 / 60, WORLD);
  assert.ok(damage > 0);
});

test('警戒范围读取当前武器和已挂载炮塔，不因仓库收藏虚增', () => {
  const g = new Game(freshProgress(), () => 0.5);
  const initial = playerThreatRange(g); g.progress.weapons[8] = 1;
  assert.equal(playerThreatRange(g), initial);
  g.progress.weapon = 8; assert.ok(playerThreatRange(g) > initial);
  const sniper = playerThreatRange(g); g.progress.weapon = 0;
  g.start(); g.progress.vehicleWeapons[8] = 1;
  assert.ok(g.configureVehicle(8)); assert.ok(g.summonVehicle());
  assert.equal(playerThreatRange(g), sniper);
});
