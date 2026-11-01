import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 秘境载具回归：真实供给、伤害、关卡检查点与冻结森林车库互相隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { syncRealm, beginRealmStage, updateRealm } from '../src/core/realm-manager.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { vehicleWeapon } from '../src/config/vehicles.js';
import { validateRealmVehicles } from '../src/progression/realm-vehicles.js';
import { moveBody } from '../src/physics/motion.js';
import { WORLD } from '../src/world/coordinates.js';

// 使用已拥有两种炮塔的测试车库，不依赖购买成本或随机暴击。
function create(mode = 'tower', index = 0) {
  const p = freshProgress();
  p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
  p.vehicleHulls.fill(1); p.vehicleWeapons[0] = p.vehicleWeapons[1] = 1;
  p.vehicleIndex = index; p.vehicleLoadouts.fill(0);
  const g = new Game(p, () => .45); g.start(); g.summonVehicle();
  g.vehicle.hp -= 31; g.vehicle.module.magazine.ammo = 3;
  g.enterRealm(mode);
  if (mode === 'guardian') g.continueRealm();
  return g;
}
// 通过正式序列化入口重建，模拟刷新回到关卡起点。
function reload(g) {
  g.progress.patrol = capturePatrol(g);
  return new Game(JSON.parse(JSON.stringify(g.progress)), () => .45);
}

// 新远征采用随机补给；爬塔与守护继续带入森林车库。
for (const mode of ['tower', 'guardian']) test(`${mode} 带入驾驶状态和独立炮塔，伤害先扣装甲`, () => {
  const g = create(mode), original = g.forestState.vehicle;
  assert.equal(g.vehicle.active, true); assert.notEqual(g.vehicle, original);
  assert.equal(g.vehicle.hp, original.hp); assert.equal(g.vehicle.module.magazine.ammo, 3);
  if (g.realm.phase === 'choice') g.chooseRealmBlessing(g.realm.offers[0]);
  const hp = g.player.hp, armor = g.vehicle.hp;
  g.hurt(20); assert.ok(g.vehicle.hp < armor); assert.equal(g.player.hp, hp);
  assert.equal(original.hp, armor); assert.equal(original.module.magazine.ammo, 3);
  g.leaveRealm(); assert.equal(g.vehicle, original); assert.equal(g.vehicle.active, true);
});

test('局内切车与炮塔保留供给；返回森林恢复原挂载与驾驶状态', () => {
  const g = create(), original = g.forestState.vehicles;
  assert.ok(g.transactTurret(1, 'equip'));
  const first = g.vehicle.module; assert.equal(first.magazine.ammo, 0);
  first.magazine.remaining = .7; first.cooldown = .3;
  assert.ok(g.transactTurret(0, 'equip')); assert.equal(g.vehicle.module.magazine.ammo, 3);
  assert.ok(g.transactTurret(1, 'equip')); assert.equal(g.vehicle.module, first);
  assert.equal(first.magazine.remaining, .7);
  assert.ok(g.selectVehicle(2)); assert.ok(g.summonVehicle()); assert.equal(g.player.flying, true);
  assert.ok(g.dismountVehicle()); assert.equal(g.player.flying, false);
  assert.ok(g.selectVehicle(0)); assert.equal(g.vehicle.module, first);
  assert.equal(g.buyVehicle(1), false); assert.equal(g.upgradeVehicle(), false);
  assert.equal(g.transactTurret(1, 'upgrade'), false);
  g.leaveRealm(); assert.equal(g.vehicles, original); assert.equal(g.progress.vehicleIndex, 0);
  assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0], 0); assert.deepEqual(g.progress.vehicleLoadouts, original.map(v=>v.weaponIndex));
  assert.equal(g.vehicle.active, true);
});

test('载具被毁后步战，60秒修复仅在战斗推进且不会自动上车', () => {
  const g = create(), hp = g.player.hp;
  g.hurt(100000); assert.equal(g.player.hp, hp); assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.cooldown, 60); assert.equal(g.summonVehicle(), false);
  g.pause(); updateVehicle(g, 20); assert.equal(g.vehicle.cooldown, 60);
  g.pause(); updateVehicle(g, 59); assert.equal(g.summonVehicle(), false);
  updateVehicle(g, 1); assert.equal(g.vehicle.active, false); assert.ok(g.summonVehicle());
  assert.equal(g.vehicle.hp, g.vehicle.maxHp);
});

test('刷新恢复所有车体和备用炮塔检查点，退出仍恢复入场前的森林车库', () => {
  const g = create(); g.transactTurret(1, 'equip');
  g.vehicle.module.magazine.remaining = .8; g.vehicle.module.cooldown = .2;
  g.hurt(100000); updateVehicle(g, 7);
  g.selectVehicle(2); g.summonVehicle(); g.vehicle.hp = 95;
  syncRealm(g);
  const checkpoint = JSON.stringify(g.progress.realms.run.vehicles);
  updateVehicle(g, 10); g.vehicle.hp = 30; g.configureVehicle(1);
  assert.equal(JSON.stringify(g.progress.realms.run.vehicles), checkpoint);
  const r = reload(g);
  assert.equal(r.progress.vehicleIndex, 2); assert.equal(r.vehicle.hp, 95);
  assert.equal(r.vehicle.active, true); assert.equal(r.player.flying, true);
  assert.equal(r.vehicles[0].cooldown, 53); assert.equal(r.vehicles[0].module.magazine.remaining, .8);
  assert.equal(r.vehicles[0].module.cooldown, .2); assert.equal(r.vehicles[0].modules[0].magazine.ammo, 3);
  r.leaveRealm(); assert.equal(r.vehicle.index, 0); assert.equal(r.vehicle.active, true);
  assert.equal(r.vehicle.hp, r.vehicle.maxHp - 31); assert.equal(r.vehicle.module.magazine.ammo, 3);
  assert.equal(r.progress.vehicleIndex, 0); assert.equal(r.progress.vehicleLoadouts[r.progress.vehicleIndex||0], 0);
});

test('独立炮塔实际开火、装填和跨层供给持续生效，直升机仍受秘境边界限制', () => {
  const g = create('tower', 2), m = g.vehicle.module;
  g.realm.warning = 0; updateRealm(g, 1);
  const e = g.enemies[0]; e.x = g.player.x + 80; e.y = g.player.y;
  updateVehicle(g, .05); assert.equal(m.magazine.ammo, 2); assert.ok(g.projectiles.length > 0);
  g.updateProjectiles(.1); assert.ok(e.hp < e.maxHp || e.hp <= 0);
  m.magazine.ammo = 0; m.magazine.remaining = .2;
  // 无目标装填检查同时清理可攻击树木，避免正式自动索敌立即消耗新弹。
  g.enemies = []; g.trees = []; g.boss = null; updateVehicle(g, .21);
  assert.equal(m.magazine.ammo, vehicleWeapon(g.progress, 0).magazineSize);
  m.magazine.ammo = 4; g.vehicle.hp = 40;
  g.realm.stage = 2; g.realm.cleared = 1; beginRealmStage(g);
  assert.equal(g.vehicle.hp, 40); assert.equal(g.vehicle.module.magazine.ammo, 4);
  moveBody(g.player, 2000, 2000, WORLD);
  assert.ok(Math.hypot(g.player.x - g.player.arena.x, g.player.y - g.player.arena.y) < g.player.arena.radius);
});

test('旧秘境存档可恢复；非法载具或未拥有炮塔不能从检查点解锁', () => {
  const g = create(); delete g.progress.realms.run.vehicles; delete g.progress.realms.run.forestVehicles;
  assert.ok(reload(g).realm);
  const saved = validateRealmVehicles({index:999,hulls:[{active:true,hp:Infinity,cooldown:-1,weaponIndex:12,modules:{12:{}}}]});
  assert.equal(saved.index, 0); assert.equal(saved.hulls[0].hp, 0);
  assert.equal(saved.hulls[0].weaponIndex, null); assert.deepEqual(saved.hulls[0].modules, {});
  syncRealm(g); const p = JSON.parse(JSON.stringify(g.progress));
  p.vehicleHulls[2] = 0; p.vehicleWeapons[1] = 0;
  p.realms.run.vehicles.index = 2; p.realms.run.vehicles.hulls[0].weaponIndex = 1;
  const restored = new Game(p);
  assert.equal(restored.vehicle.index, 0); assert.equal(restored.vehicle.weaponIndex, null);
});
