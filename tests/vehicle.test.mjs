import { ownedPineProgress as freshProgress } from './helpers/owned-pine-progress.mjs';
import { vehicleCombatFixture } from './helpers/vehicle-combat-fixture.mjs';
import { WORLD } from '../src/world/coordinates.js';
// 战车验收：装甲吸收、原地步战、战斗冷却、独立武器与永久配置兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/game.js';
import { updateVehicle, vehicleMuzzle } from '../src/combat/vehicle.js';

// 静止耐久靶使用正式目标及弹道流程，不触发额外怪物波次。
function arena(index = 0) {
  const p = freshProgress();
  p.weapons.fill(1);
  p.vehicleWeapons = WEAPONS.map(w=>w.controller?0:1);
  p.vehicleLoadouts[p.vehicleIndex||0] = index;
  const g = vehicleCombatFixture(p, () => 0.5);
  g.start();
  // 受伤断言在营地保护区外进行，不让新增的安全区规则吞掉伤害。
  Object.assign(g.player,{x:1200,y:2400});
  g.trees = [];
  g.enemies = [];
  g.boss = null;
  g.spawnTimer = 999;
  g.enemies = [
    { id: 100, type: 'enemy', x: g.player.x + 120, y: g.player.y, hp: 1e6, maxHp: 1e6, radius: 18 },
  ];
  return g;
}
// 以固定小步推进载具，测试不依赖现实时间和浏览器帧率。
function tick(g, seconds, dt = 1 / 120) {
  while (seconds > 1e-8) {
    const step = Math.min(dt, seconds);
    updateVehicle(g, step);
    seconds -= step;
  }
}

test('召唤改变形态与装甲，不改变角色血量、坐标、装备或主武器弹夹', () => {
  const g = arena();
  g.player.hp = 75;
  g.magazines[0].ammo = 4;
  const player = structuredClone(g.player),
    magazine = structuredClone(g.magazines[0]);
  assert.equal(g.summonVehicle(), true);
  assert.equal(g.vehicle.hp, 240);
  assert.deepEqual(g.player, player);
  assert.deepEqual(g.magazines[0], magazine);
  assert.equal(g.progress.weapon, 0);
  g.hurt(30);
  assert.equal(g.vehicle.hp, 210);
  assert.equal(g.player.hp, 75);
  g.dismountVehicle();
  g.summonVehicle();
  assert.equal(g.vehicle.hp, 210, '主动下车不能修复');
});
test('装甲溢出不杀猫，安全下车，等待不会自动修复报废车', () => {
  const g = arena();
  g.summonVehicle();
  g.player.hp = 80;
  const pos = [g.player.x, g.player.y];
  g.hurt(9999);
  assert.equal(g.state, 'playing');
  assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.cooldown, 0);
  assert.deepEqual([g.progress.vehicleService[0].position.x,g.progress.vehicleService[0].position.y],pos);
  assert.ok(Math.hypot(g.player.x-pos[0],g.player.y-pos[1])>=60);
  assert.equal(g.player.hp, 80);
  g.hurt(50);
  assert.equal(g.player.hp, 80, '破车短暂无敌');
  assert.equal(g.summonVehicle(), false);
  tick(g, 59.9);
  assert.equal(g.summonVehicle(), false);
  tick(g, 0.1);
  assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.cooldown, 0);
  assert.equal(g.summonVehicle(), false);
  assert.equal(g.vehicle.hp, 0);
  assert.equal(g.player.hp, 80);
});
test('暂停与死亡冻结冷却、弹夹和蓄能，重生及清档恢复步战初态', () => {
  const g = arena(9);
  g.summonVehicle();
  tick(g, 0.7);
  g.hurt(9999);
  const state = JSON.stringify(g.vehicle);
  g.pause();
  tick(g, 40);
  assert.equal(JSON.stringify(g.vehicle), state);
  g.state = 'dead';
  tick(g, 40);
  assert.equal(JSON.stringify(g.vehicle), state);
  g.start();
  assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.cooldown, 0);
  assert.equal(g.vehicle.weaponIndex, 9);
  g.resetProgress();
  assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0], null);
  assert.equal(g.vehicle.weaponIndex, null);
  assert.equal(g.progress.arrival.phase,'bus');
  assert.equal(g.summonVehicle(), false);
});
test('同款主枪和炮塔独立扣弹；十二种枪械来源、弹夹容量和装填一致', () => {
  for (let i = 0; i < 12; i++) {
    const g = arena(i);
    const sources = [],
      hit = g.hit.bind(g);
    // 即时光束在命中时记录归属，在途弹则从弹丸快照检查。
    g.hit = (target, amount, critical, details) => {
      sources.push(details?.weaponIndex);
      return hit(target, amount, critical, details);
    };
    g.summonVehicle();
    const main = structuredClone(g.magazines),
      w = WEAPONS[i];
    tick(g, w.chargeTime ? 1.6 : 0.05);
    assert.equal(g.vehicle.module.magazine.ammo, Math.floor(w.magazineSize*1.5) - 1, w.id);
    assert.deepEqual(g.magazines, main, w.id + '污染主弹夹');
    assert.ok(
      sources.includes(i) || [...g.projectiles, ...g.shots].some((b) => b.weaponIndex === i),
      w.id + '来源丢失',
    );
    g.enemies = [];
    g.vehicle.module.magazine = { ammo: 0, remaining: w.reloadTime };
    tick(g, w.reloadTime - 0.1);
    assert.equal(g.vehicle.module.magazine.ammo, 0);
    tick(g, 0.1);
    assert.equal(g.vehicle.module.magazine.ammo, Math.floor(w.magazineSize*1.5));
  }
});
test('换装不能补弹；主武器切换、角色升级与改装不重置装甲或炮塔冷却', () => {
  const g = arena(9);
  g.summonVehicle();
  const v = g.vehicle;
  v.hp = 85;
  v.module.magazine.ammo = 1;
  v.module.pulse.charge = 0.6;
  v.module.pulse.cooldown = 0.5;
  assert.equal(g.configureVehicle(13), false);
  assert.equal(g.configureVehicle(1), true);
  assert.equal(v.module.magazine.ammo, 0);
  assert.equal(g.configureVehicle(9), true);
  assert.equal(v.module.magazine.ammo, 1);
  assert.equal(v.module.pulse.charge, 0.6);
  g.transact('weapons', 1, 'equip');
  assert.equal(v.module.magazine.ammo, 1);
  assert.equal(v.hp, 85);
  g.progress.coins = 10000;
  g.progress.wood = 10000;
  g.progress.mastery[9] = 40;
  g.modifyWeapon(9, 1);
  assert.equal(v.module.pulse.charge, 0);
  assert.equal(v.module.pulse.cooldown, 0.5);
  assert.equal(v.module.magazine.ammo, 1);
});
test('怪物优先、锁定稳定、树干阻挡独立炮口，地图接缝正确瞄准', () => {
  const g = arena();
  g.summonVehicle();
  g.trees = [{ id: 101, type: 'tree', x: g.player.x + 55, y: g.player.y, hp: 1e5, radius: 18 }];
  tick(g, 0.05);
  assert.equal(g.vehicle.targetId, 100);
  g.updateProjectiles(0.15);
  assert.ok(g.trees[0].hp < 1e5);
  assert.equal(g.enemies[0].hp, 1e6);
  g.enemies.push({
    id: 102,
    type: 'enemy',
    x: g.player.x + 90,
    y: g.player.y,
    hp: 1e5,
    radius: 18,
  });
  tick(g, 0.05);
  assert.equal(g.vehicle.targetId, 100);
  g.enemies = [];
  tick(g, 0.05);
  assert.equal(g.vehicle.targetId, 101);
  g.player.x = WORLD.width - 10;
  g.trees = [];
  g.enemies = [{ id: 103, type: 'enemy', x: 25, y: g.player.y, hp: 1e5, radius: 18 }];
  tick(g, 0.05);
  assert.equal(g.vehicle.targetId, 103);
  assert.ok(Math.cos(g.vehicle.angle) > 0.8);
  assert.ok(Number.isFinite(vehicleMuzzle(g.player, g.vehicle).x));
});
test('榴弹额外技能保留、炮塔在途弹换装后仍归属原枪、步战不偷跑装填', () => {
  const g = arena(6);
  g.summonVehicle();
  tick(g, 3.2);
  assert.ok(g.projectiles.some((b) => b.kind === 'grenade-bomb' && b.weaponIndex === 6));
  const bomb = g.projectiles.find((b) => b.kind === 'grenade-bomb');
  g.configureVehicle(3);
  assert.equal(bomb.weaponIndex, 6);
  const remain = g.vehicle.module.magazine.remaining;
  g.dismountVehicle();
  tick(g, 10);
  assert.equal(g.vehicle.module.magazine.remaining, remain);
});


test('正式游戏更新同时驱动主武器和炮塔，不挪用原枪弹夹', () => {
  const g = arena(1);
  g.enemies = [];
  g.addTree(g.player.x + 130, g.player.y, { hp: 100000, maxHp: 100000 });
  g.summonVehicle();
  for (let i = 0; i < 40; i++) g.update(0.025);
  assert.ok(g.magazines[0].ammo < 12);
  assert.ok(g.vehicle.module.magazine.ammo < 30);
  assert.equal(g.magazines[1].ammo, 20);
  const old = g.vehicle.module.magazine.ammo;
  g.dismountVehicle();
  for (let i = 0; i < 40; i++) g.update(0.025);
  assert.equal(g.vehicle.module.magazine.ammo, old);
});
