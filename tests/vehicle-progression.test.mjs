import { ownedPineProgress as freshProgress } from './helpers/owned-pine-progress.mjs';
import { equipmentRecipe } from '../src/progression/workshop/equipment-goals.js';
// 独立炮塔经济与载具成长回归，覆盖旧档迁移、扣费、真实伤害和供给保护。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import { vehicleDamage } from '../src/config/vehicles.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { unlockedWeaponProgress } from '../src/progression/workshop/unlock-weapons.js';

// 空战场避免怪物波次和主枪攻击干扰交易验证。
function arena() {
  const p = freshProgress();p.materials = { parts: 10000, crystal: 10000, core: 100 };p.coins=50000;p.wood=50000;p.bosses=30;
  const g=new Game(p,()=>.5);g.start();g.trees=[];g.enemies=[];g.spawnTimer=g.attackTimer=999;
  return g;
}

test('手持枪所有权与一键解锁不会赠送炮塔，自带机枪也能驾驶和承伤',()=>{
  const g=arena();g.progress=unlockedWeaponProgress(g.progress);
  assert.equal(g.configureVehicle(1),false);assert.equal(g.vehicle.weaponIndex,17);
  assert.equal(g.summonVehicle(),true);updateVehicle(g,.5);g.hurt(50);
  assert.equal(g.vehicle.hp,190);assert.equal(g.player.hp,120);assert.equal(g.projectiles.length,0);
});

test('炮塔购买无战绩限制但检验折后双资源，失败不扣费、重复购买不扣费、购买后手动安装',()=>{
  const g=arena();g.progress.bosses=0;
  const cost=equipmentRecipe('turret',1,g.progress);g.progress.wood=cost.wood-1;let before=structuredClone(g.progress);
  assert.equal(g.transactTurret(1,'buy'),false);assert.deepEqual(g.progress,before);
  g.progress.wood=1000;const coins=g.progress.coins;
  assert.equal(g.transactTurret(1,'buy'),true);assert.equal(g.progress.coins,coins-cost.coins);assert.equal(g.progress.wood,1000-cost.wood);
  assert.equal(g.progress.weapons[1],0);assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0],17);
  before=structuredClone(g.progress);assert.equal(g.transactTurret(1,'buy'),false);assert.deepEqual(g.progress,before);
  assert.equal(g.transactTurret(1,'equip'),true);assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0],1);
  assert.deepEqual(g.vehicle.module.magazine,{ammo:0,remaining:2.2});
  for(const i of [-1,99,12,13,null,'1'])assert.equal(g.transactTurret(i,'buy'),false);
});

test('载具升级保持耐久比例，损毁与装填冷却不被升级跳过，满级和余额不足不扣费',()=>{
  const g=arena();g.transactTurret(0,'buy');g.configureVehicle(0);g.summonVehicle();g.hurt(120);
  const magazine=structuredClone(g.vehicle.module),coins=g.progress.coins;
  assert.equal(g.upgradeVehicle(),true);assert.equal(g.vehicle.maxHp,280);assert.equal(g.vehicle.hp,140);
  assert.equal(g.progress.coins,coins-80);assert.deepEqual(g.vehicle.module,magazine);
  g.player.invincible=0;g.hurt(999);assert.equal(g.upgradeVehicle(),true);
  assert.equal(g.vehicle.hp,0);assert.equal(g.vehicle.cooldown,30);assert.equal(g.summonVehicle(),false);
  updateVehicle(g,30);assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.hp,320);
  g.progress.coins=0;const before=structuredClone(g.progress);assert.equal(g.upgradeVehicle(),false);assert.deepEqual(g.progress,before);
  g.progress.coins=g.progress.wood=1000000;while(g.progress.vehicleHulls[g.progress.vehicleIndex||0]<20)assert.equal(g.upgradeVehicle(),true);
  const maxed=structuredClone(g.progress);assert.equal(g.upgradeVehicle(),false);assert.deepEqual(g.progress,maxed);
});

test('炮塔伤害独立升级，升级不补弹、不改变在途伤害，击杀记录同型号熟练度',()=>{
  const g=arena();g.transactTurret(0,'buy');g.configureVehicle(0);g.summonVehicle();
  const damage=vehicleDamage(g.progress,0);g.progress.weapons[0]=20;
  assert.equal(vehicleDamage(g.progress,0),damage);
  const e={id:123,type:'enemy',x:1020,y:700,hp:1000,maxHp:1000,radius:18};g.enemies=[e];
  updateVehicle(g,1.3);assert.equal(g.projectiles.length,1);
  const module=structuredClone(g.vehicle.module),snapshot=structuredClone(g.projectiles);
  assert.equal(g.transactTurret(0,'upgrade'),true);assert.deepEqual(g.vehicle.module,module);assert.deepEqual(g.projectiles,snapshot);
  assert.ok(vehicleDamage(g.progress,0)>damage);g.updateProjectiles(.2);assert.equal(e.hp,1000-damage);
  assert.equal(g.progress.weapons[0],20);
  g.transactTurret(1,'buy');g.configureVehicle(1);g.vehicle.module.magazine.remaining=0;g.vehicle.module.magazine.ammo=20;
  e.hp=1;e.x=1000;e.y=705;const xp=g.progress.mastery[1];updateVehicle(g,.05);
  assert.ok(g.progress.mastery[1]>xp);assert.equal(g.progress.weapons[1],0);
});
