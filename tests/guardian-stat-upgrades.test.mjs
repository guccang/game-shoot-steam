// 四项独立成长验证真实事务、火力、供给、兼容存档和退款，而非只检查展示文本。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { guardianWeaponStats } from '../src/config/guardian-equipment.js';
import { GUARDIAN_STAT_KEYS, guardianStatLevel, guardianNextStat } from '../src/config/guardian-upgrades.js';
import { guardianInvestment, guardianPads } from '../src/config/guardian.js';
import { validateRealms } from '../src/progression/realms/realm-progress.js';
import { updateGuardianDefenses } from '../src/core/battle/guardian-defense.js';
import { updateRealm } from '../src/core/realms/realm-manager.js';
import { advanceReload, consumeRound } from '../src/combat/magazine.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { vehicleWeapon } from '../src/config/vehicles.js';
import { guardianMarkup } from '../src/ui/panels/guardian.js';

// 每例建立独立局内状态，解锁枪械但保持永久能力基线。
function setup(index=0) {
  const g=new Game(undefined,()=>.45);g.progress.weapons.fill(1);g.progress.vehicleHulls.fill(1);
  g.enterRealm('guardian');g.realm.realmCoins=50000;g.guardianDefense('deploy',0,'weapon',index);return g;
}

test('四项各自扣款和计级，仅选中项变化，满攻击仍能升级供给',()=>{
  const g=setup(),tower=g.realm.defenses[0];
  for(const key of GUARDIAN_STAT_KEYS){
    const before=guardianWeaponStats(g.progress,tower),coins=g.realm.realmCoins;
    const next=guardianNextStat(tower,key),preview=guardianWeaponStats(g.progress,next);
    assert.ok(g.guardianDefense('upgrade',0,key));assert.equal(g.realm.realmCoins,coins-40);
    const after=guardianWeaponStats(g.progress,tower);assert.equal(after[key],preview[key]);
    for(const other of GUARDIAN_STAT_KEYS)if(other!==key)assert.equal(after[other],before[other]);
    assert.equal(guardianStatLevel(tower,key),2);
  }
  for(let i=2;i<10;i++)assert.ok(g.guardianDefense('upgrade',0,'damage'));
  assert.equal(g.guardianDefense('upgrade',0,'damage'),false);assert.ok(g.guardianDefense('upgrade',0,'rate'));
  const balance=g.realm.realmCoins;assert.equal(g.guardianDefense('upgrade',0,'unknown'),false);assert.equal(g.realm.realmCoins,balance);
  g.realm.realmCoins=39;assert.equal(g.guardianDefense('upgrade',0,'reload'),false);
  g.realm.realmCoins=500;g.continueRealm();g.pause();assert.equal(g.guardianDefense('upgrade',0,'magazine'),false);
});

test('普通炮、脉冲、浮游炮和无人机实际参数与预览一致，永久装备和其他塔不变',()=>{
  for(const index of [0,9,12,13]){
    const g=setup(index),permanent=structuredClone(g.progress),tower=g.realm.defenses[0];
    g.guardianDefense('deploy',1,'weapon',index);
    if(index===12)g.guardianDefense('mount',0,'weapon',0,9);
    for(const key of GUARDIAN_STAT_KEYS)assert.ok(g.guardianDefense('upgrade',0,key));
    g.continueRealm();g.trees=[];updateGuardianDefenses(g,.01);
    const local=tower.runtime,weapon=index===12?local.funnel.nodes[0].weapon:index===13?local.weapon():vehicleWeapon(local.progress,index);
    const stats=guardianWeaponStats(g.progress,tower,{},tower.level,index===12?0:null);
    assert.equal(stats.rate,1/weapon.interval);assert.equal(stats.magazine,weapon.magazineSize);assert.equal(stats.reload,weapon.reloadTime);
    const magazine=index===12?local.funnel.nodes[0].magazine:index===13?local.magazines[13]:local.vehicle.module.magazine;
    assert.equal(magazine.ammo,stats.magazine);
    if(weapon.chargeTime)assert.ok(Math.abs(weapon.interval-weapon.chargeTime-weapon.cooldown)<1e-10);
    assert.equal(g.realm.defenses[1].runtime.progress.guardianUpgrades.rate,1);
    assert.deepEqual(g.progress.weapons,permanent.weapons);assert.deepEqual(g.progress.funnelLoadout,permanent.funnelLoadout);
    assert.equal(effectiveWeapon(g.progress,0).magazineSize,effectiveWeapon(permanent,0).magazineSize);
  }
});

test('扩容不补弹，换弹升级保持进度，浮游炮收起模块同步且不重复缩短',()=>{
  for(const index of [0,12,13]){
    const g=setup(index);g.continueRealm();const local=g.realm.defenses[0].runtime;
    const magazine=index===12?local.funnel.nodes[0].magazine:index===13?local.magazines[13]:local.vehicle.module.magazine;
    magazine.ammo=2;magazine.remaining=1.2;
    g.funnel.nodes[0].magazine.remaining=2;const playerReload=g.funnel.nodes[0].magazine.remaining;
    assert.ok(g.guardianDefense('upgrade',0,'magazine'));assert.equal(magazine.ammo,2);assert.equal(magazine.remaining,1.2);
    assert.ok(g.guardianDefense('upgrade',0,'reload'));assert.ok(Math.abs(magazine.remaining-1.2/1.15)<1e-10);
    assert.equal(g.funnel.nodes[0].magazine.remaining,playerReload);
    const weapon=local.weapon(index);advanceReload(magazine,weapon,2);if(index===0)assert.equal(magazine.ammo,weapon.magazineSize);else assert.ok(magazine.ammo>2&&magazine.ammo<weapon.magazineSize);
    while(magazine.ammo>0)consumeRound(magazine,weapon);assert.equal(magazine.remaining,index===0?weapon.reloadTime:0);
    if(index===12){
      g.guardianDefense('mount',0,'weapon',0,1);const stored=local.funnel.nodes[0].loadouts[12].magazine;
      const remaining=stored.remaining;g.guardianDefense('upgrade',0,'reload');
      assert.ok(Math.abs(stored.remaining-remaining*1.15/1.3)<1e-10);
      g.guardianDefense('mount',0,'weapon',0,12);assert.equal(local.funnel.nodes[0].magazine,stored);
    }
  }
});

test('真实自动射击随攻速升级变快，保持弹夹和当前冷却',()=>{
  const shots=[];
  for(const upgrade of [false,true]){
    const g=setup();g.continueRealm();const local=g.realm.defenses[0].runtime;
    local.vehicle.module.magazine.ammo=100;local.vehicle.module.cooldown=.4;
    if(upgrade)for(let i=1;i<10;i++)g.guardianDefense('upgrade',0,'rate');
    assert.equal(local.vehicle.module.cooldown,.4);assert.equal(local.vehicle.module.magazine.ammo,100);
    const pad=guardianPads(g.realm.arena)[0],enemy=g.spawnEnemy(0,0,{x:pad.x+70,y:pad.y});enemy.hp=100000;
    for(let i=0;i<300;i++)updateGuardianDefenses(g,.01);
    shots.push(100-local.vehicle.module.magazine.ammo);
  }
  assert.ok(shots[1]>shots[0]*1.7,JSON.stringify(shots));
});

test('各项存档与退款完整，战中回滚检查点，旧档攻击不丢失且损坏供给有界',()=>{
  const g=setup(),tower=g.realm.defenses[0];for(const key of GUARDIAN_STAT_KEYS)g.guardianDefense('upgrade',0,key);
  let restored=new Game(structuredClone(g.progress));assert.deepEqual(restored.realm.defenses[0].upgrades,{rate:2,magazine:2,reload:2});
  assert.equal(guardianInvestment(tower),220);g.continueRealm();g.guardianDefense('upgrade',0,'rate');
  restored=new Game(structuredClone(g.progress));assert.equal(restored.realm.defenses[0].upgrades.rate,2);
  g.enemies=[];g.realm.kills=g.realm.spec.total;updateRealm(g,0);
  restored=new Game(structuredClone(g.progress));assert.equal(restored.realm.defenses[0].upgrades.rate,3);
  const balance=restored.realm.realmCoins;restored.guardianDefense('remove',0);assert.equal(restored.realm.realmCoins,balance+300);
  const raw=structuredClone(g.progress.realms);raw.run.defenses[0].level=7;delete raw.run.defenses[0].upgrades;
  const legacy=validateRealms(raw).run.defenses[0];assert.equal(legacy.level,7);assert.equal(guardianStatLevel(legacy,'rate'),1);
  raw.run.defenses[0].upgrades={rate:Infinity,magazine:-2,reload:999,damage:99};
  assert.deepEqual(validateRealms(raw).run.defenses[0].upgrades,{rate:1,magazine:1,reload:10});
});

test('每行都有独立按钮、费用和下一值，余额不足禁用，满级不影响其他属性',()=>{
  const g=setup(),tower=g.realm.defenses[0];tower.level=10;g.realm.realmCoins=40;
  const html=guardianMarkup(g,{slot:0});
  for(const key of GUARDIAN_STAT_KEYS)assert.match(html,new RegExp(`data-guardian-stat="${key}"`));
  assert.equal((html.match(/data-guardian-action="upgrade"/g)||[]).length,4);
  assert.match(html,/data-guardian-stat="damage"[^>]*disabled/);assert.doesNotMatch(html,/data-guardian-stat="rate"[^>]*disabled/);
  assert.match(html,/40 秘境币/);assert.match(html,/升级后/);
});
